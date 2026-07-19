import json
import logging

import asyncpg
from fastapi import HTTPException, status
from google.genai import errors, types

from app.core.gemini_client import get_gemini_client
from app.db.pool import get_pool
from app.repositories import (
    ai_tool_repository,
    ai_tool_request_repository,
    ai_trust_evaluation_repository,
    audit_log_repository,
)
from app.schemas.ai_tool import (
    AiToolCreate,
    AiToolOut,
    AiToolUpdate,
    AiTrustEvaluationCreate,
    AiTrustEvaluationOut,
    AiTrustEvaluationProposal,
)
from app.services.ai_tool_decision_notifier import notify_tool_access_revoked, notify_tool_decision

logger = logging.getLogger(__name__)

_EVAL_MODEL = "gemini-flash-lite-latest"
_EVAL_SYSTEM_INSTRUCTION = (
    "You are an AI governance risk evaluator inside VeriGate, an enterprise AI "
    "governance gateway. Given information about a third-party AI tool, assess it "
    "on six criteria: security, privacy, compliance, availability, explainability, "
    "and organizational policy fit. For EACH criterion return an integer score from "
    "0 (fails the criterion badly) to 100 (fully satisfies it) AND a one-sentence "
    "reason specific to that criterion explaining the score. Base the assessment on "
    "what is realistically known about the named vendor/product and general AI "
    "governance best practice; if information is limited, score conservatively and "
    "say so in the reason. Also provide a 2-3 sentence overall justification "
    "summarizing the assessment across all six criteria."
)
_EVAL_SCHEMA = types.Schema(
    type="OBJECT",
    properties={
        "securityScore": types.Schema(type="INTEGER"),
        "securityReason": types.Schema(type="STRING"),
        "privacyScore": types.Schema(type="INTEGER"),
        "privacyReason": types.Schema(type="STRING"),
        "complianceScore": types.Schema(type="INTEGER"),
        "complianceReason": types.Schema(type="STRING"),
        "availabilityScore": types.Schema(type="INTEGER"),
        "availabilityReason": types.Schema(type="STRING"),
        "explainabilityScore": types.Schema(type="INTEGER"),
        "explainabilityReason": types.Schema(type="STRING"),
        "orgPolicyScore": types.Schema(type="INTEGER"),
        "orgPolicyReason": types.Schema(type="STRING"),
        "justification": types.Schema(type="STRING"),
    },
    required=[
        "securityScore",
        "securityReason",
        "privacyScore",
        "privacyReason",
        "complianceScore",
        "complianceReason",
        "availabilityScore",
        "availabilityReason",
        "explainabilityScore",
        "explainabilityReason",
        "orgPolicyScore",
        "orgPolicyReason",
        "justification",
    ],
)


def _overall_score(scores: list[int]) -> int:
    return round(sum(scores) / len(scores))


def _tool_snapshot(row) -> str:
    return json.dumps(
        {
            "vendor": row["vendor"],
            "version": row["version"],
            "riskTier": row["riskTier"],
            "description": row["description"],
        }
    )


async def list_ai_tools() -> list[AiToolOut]:
    pool = get_pool()
    rows = await ai_tool_repository.list_ai_tools(pool)
    return [AiToolOut(**dict(row)) for row in rows]


async def create_ai_tool(payload: AiToolCreate, actor_id: str) -> AiToolOut:
    if payload.riskTier == "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A tool can only be marked Approved by approving a trust evaluation.",
        )
    pool = get_pool()
    row = await ai_tool_repository.create_ai_tool(
        pool,
        name=payload.name,
        vendor=payload.vendor,
        version=payload.version,
        endpoint=payload.endpoint,
        description=payload.description,
        risk_tier=payload.riskTier,
    )

    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action="AI Tool Added",
        entity_type="AiTool",
        entity_id=row["id"],
        snapshot=_tool_snapshot(row),
    )

    return AiToolOut(**dict(row))


async def update_ai_tool(tool_id: str, payload: AiToolUpdate, actor_id: str) -> AiToolOut:
    if payload.riskTier == "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A tool can only be marked Approved by approving a trust evaluation.",
        )
    pool = get_pool()
    row = await ai_tool_repository.update_ai_tool(
        pool,
        tool_id,
        vendor=payload.vendor,
        version=payload.version,
        endpoint=payload.endpoint,
        description=payload.description,
        risk_tier=payload.riskTier,
        is_approved=False if payload.riskTier else None,
        approved_by_id=None,
        decision_notes=payload.decisionNotes if payload.riskTier else None,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI tool not found.")

    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action="AI Tool Updated",
        entity_type="AiTool",
        entity_id=tool_id,
        snapshot=_tool_snapshot(row),
    )

    if payload.riskTier == "BLOCKED":
        # Anyone previously granted access via an approved request loses it
        # the moment this tool is disabled — tell them now instead of
        # letting them find out from a 403 on their next prompt.
        affected_requests = await ai_tool_request_repository.list_approved_requests_by_tool_id(
            pool, tool_id
        )
        for request_row in affected_requests:
            await notify_tool_access_revoked(
                pool, request_row=request_row, reason=payload.decisionNotes
            )

    return AiToolOut(**dict(row))


async def delete_ai_tool(tool_id: str, actor_id: str) -> None:
    pool = get_pool()
    # Fetched before deletion — see policy_service.delete_policy for why.
    tool = await ai_tool_repository.get_ai_tool(pool, tool_id)
    try:
        deleted = await ai_tool_repository.delete_ai_tool(pool, tool_id)
    except asyncpg.exceptions.ForeignKeyViolationError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This tool has evaluation or usage history and can't be removed. Disable it instead.",
        ) from error
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI tool not found.")

    tool_name = tool["name"] if tool else tool_id
    snapshot = _tool_snapshot(tool) if tool else None
    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action=f'AI Tool Removed: "{tool_name}"',
        entity_type="AiTool",
        entity_id=tool_id,
        snapshot=snapshot,
    )

    # Approved/evaluated tools can't reach this point (the FK check above
    # already 409s them) — but a still-pending registration can, so any
    # requester waiting on it needs to be told it's gone rather than left
    # pointing at a tool name nothing will ever create again.
    if tool is not None:
        dangling_requests = await ai_tool_request_repository.list_pending_requests_by_tool_name(
            pool, tool_name
        )
        reason = "This AI tool's registration was removed by an administrator."
        for request_row in dangling_requests:
            resolved = await ai_tool_request_repository.resolve_request(
                pool,
                request_row["id"],
                request_status="REJECTED",
                reviewed_by_id=actor_id,
                rejection_reason=reason,
            )
            await notify_tool_decision(pool, request_row=resolved, decision="REJECTED", reason=reason)


async def propose_trust_evaluation(tool_id: str) -> AiTrustEvaluationProposal:
    pool = get_pool()
    tool = await ai_tool_repository.get_ai_tool(pool, tool_id)
    if tool is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI tool not found.")

    prompt = (
        f"AI Tool: {tool['name']}\n"
        f"Vendor: {tool['vendor']}\n"
        f"Version: {tool['version'] or 'Unknown'}\n"
        f"Description: {tool['description'] or 'No description provided.'}"
    )

    try:
        client = get_gemini_client()
        response = await client.aio.models.generate_content(
            model=_EVAL_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=_EVAL_SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                response_schema=_EVAL_SCHEMA,
            ),
        )
        data = json.loads(response.text)
    except errors.APIError as error:
        logger.error("Gemini API error (code=%s): %s", error.code, error.message)
        if error.code == 429:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="The AI evaluator is getting a lot of requests right now — try again shortly.",
            ) from error
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI evaluator is temporarily unavailable.",
        ) from error
    except (json.JSONDecodeError, KeyError) as error:
        logger.error("Unexpected AI evaluation response: %s", error)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI evaluator returned an unexpected response.",
        ) from error

    scores = [
        data["securityScore"],
        data["privacyScore"],
        data["complianceScore"],
        data["availabilityScore"],
        data["explainabilityScore"],
        data["orgPolicyScore"],
    ]

    return AiTrustEvaluationProposal(
        securityScore=data["securityScore"],
        securityReason=data["securityReason"],
        privacyScore=data["privacyScore"],
        privacyReason=data["privacyReason"],
        complianceScore=data["complianceScore"],
        complianceReason=data["complianceReason"],
        availabilityScore=data["availabilityScore"],
        availabilityReason=data["availabilityReason"],
        explainabilityScore=data["explainabilityScore"],
        explainabilityReason=data["explainabilityReason"],
        orgPolicyScore=data["orgPolicyScore"],
        orgPolicyReason=data["orgPolicyReason"],
        overallScore=_overall_score(scores),
        justification=data["justification"],
    )


async def resolve_trust_evaluation(
    tool_id: str, payload: AiTrustEvaluationCreate, reviewer_id: str
) -> AiTrustEvaluationOut:
    pool = get_pool()
    tool = await ai_tool_repository.get_ai_tool(pool, tool_id)
    if tool is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI tool not found.")

    if payload.decision == "REJECTED" and not payload.rejectionReason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A rejection reason is required when rejecting an evaluation.",
        )

    scores = [
        payload.securityScore,
        payload.privacyScore,
        payload.complianceScore,
        payload.availabilityScore,
        payload.explainabilityScore,
        payload.orgPolicyScore,
    ]
    overall_score = _overall_score(scores)

    eval_row = await ai_trust_evaluation_repository.create_trust_evaluation(
        pool,
        ai_tool_id=tool_id,
        security_score=payload.securityScore,
        security_reason=payload.securityReason,
        privacy_score=payload.privacyScore,
        privacy_reason=payload.privacyReason,
        compliance_score=payload.complianceScore,
        compliance_reason=payload.complianceReason,
        availability_score=payload.availabilityScore,
        availability_reason=payload.availabilityReason,
        explainability_score=payload.explainabilityScore,
        explainability_reason=payload.explainabilityReason,
        org_policy_score=payload.orgPolicyScore,
        org_policy_reason=payload.orgPolicyReason,
        overall_score=overall_score,
        justification=payload.justification,
        evaluated_by_id=reviewer_id,
    )

    is_approved = payload.decision == "APPROVED"
    await ai_tool_repository.update_ai_tool(
        pool,
        tool_id,
        risk_tier="APPROVED" if is_approved else "BLOCKED",
        is_approved=is_approved,
        approved_by_id=reviewer_id if is_approved else None,
        decision_notes=payload.rejectionReason if not is_approved else None,
    )

    await audit_log_repository.create_audit_log(
        pool,
        user_id=reviewer_id,
        action=f"AI Trust Evaluation {payload.decision.title()}",
        entity_type="AiTool",
        entity_id=tool_id,
    )

    # Resolve every AI Tool Request pending for this tool name with the same
    # decision, and notify each requester — not just whoever prompted this
    # particular evaluation, since several employees may have requested the
    # same tool independently.
    pending_requests = await ai_tool_request_repository.list_pending_requests_by_tool_name(
        pool, tool["name"]
    )
    for request_row in pending_requests:
        resolved = await ai_tool_request_repository.resolve_request(
            pool,
            request_row["id"],
            request_status=payload.decision,
            reviewed_by_id=reviewer_id,
            approved_tool_id=tool_id if is_approved else None,
            rejection_reason=payload.rejectionReason if not is_approved else None,
        )
        await notify_tool_decision(
            pool, request_row=resolved, decision=payload.decision, reason=payload.rejectionReason
        )

    return AiTrustEvaluationOut(**dict(eval_row))


async def get_latest_trust_evaluation(tool_id: str) -> AiTrustEvaluationOut | None:
    pool = get_pool()
    tool = await ai_tool_repository.get_ai_tool(pool, tool_id)
    if tool is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI tool not found.")

    row = await ai_trust_evaluation_repository.get_latest_trust_evaluation(pool, tool_id)
    return AiTrustEvaluationOut(**dict(row)) if row else None
