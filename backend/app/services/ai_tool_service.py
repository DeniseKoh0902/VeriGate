import json
import logging

import asyncpg
from fastapi import HTTPException, status
from google.genai import errors, types

from app.core.gemini_client import get_gemini_client
from app.db.pool import get_pool
from app.repositories import ai_tool_repository, ai_trust_evaluation_repository
from app.repositories.user_repository import get_or_create_system_user
from app.schemas.ai_tool import (
    AiToolCreate,
    AiToolOut,
    AiToolUpdate,
    AiTrustEvaluationCreate,
    AiTrustEvaluationOut,
    AiTrustEvaluationProposal,
)

logger = logging.getLogger(__name__)

_EVAL_MODEL = "gemini-flash-lite-latest"
_EVAL_SYSTEM_INSTRUCTION = (
    "You are an AI governance risk evaluator inside VeriGate, an enterprise AI "
    "governance gateway. Given information about a third-party AI tool, assess it "
    "on six criteria and return integer scores from 0 (fails the criterion badly) "
    "to 100 (fully satisfies it): security, privacy, compliance, availability, "
    "explainability, and organizational policy fit. Base the assessment on what is "
    "realistically known about the named vendor/product and general AI governance "
    "best practice; if information is limited, score conservatively and say so in "
    "the justification. Keep the justification to 2-3 sentences."
)
_EVAL_SCHEMA = types.Schema(
    type="OBJECT",
    properties={
        "securityScore": types.Schema(type="INTEGER"),
        "privacyScore": types.Schema(type="INTEGER"),
        "complianceScore": types.Schema(type="INTEGER"),
        "availabilityScore": types.Schema(type="INTEGER"),
        "explainabilityScore": types.Schema(type="INTEGER"),
        "orgPolicyScore": types.Schema(type="INTEGER"),
        "justification": types.Schema(type="STRING"),
    },
    required=[
        "securityScore",
        "privacyScore",
        "complianceScore",
        "availabilityScore",
        "explainabilityScore",
        "orgPolicyScore",
        "justification",
    ],
)


def _overall_score(scores: list[int]) -> int:
    return round(sum(scores) / len(scores))


async def list_ai_tools() -> list[AiToolOut]:
    pool = get_pool()
    rows = await ai_tool_repository.list_ai_tools(pool)
    return [AiToolOut(**dict(row)) for row in rows]


async def create_ai_tool(payload: AiToolCreate) -> AiToolOut:
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
    return AiToolOut(**dict(row))


async def update_ai_tool(tool_id: str, payload: AiToolUpdate) -> AiToolOut:
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
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI tool not found.")
    return AiToolOut(**dict(row))


async def delete_ai_tool(tool_id: str) -> None:
    pool = get_pool()
    try:
        deleted = await ai_tool_repository.delete_ai_tool(pool, tool_id)
    except asyncpg.exceptions.ForeignKeyViolationError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This tool has evaluation or usage history and can't be removed. Disable it instead.",
        ) from error
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI tool not found.")


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
        privacyScore=data["privacyScore"],
        complianceScore=data["complianceScore"],
        availabilityScore=data["availabilityScore"],
        explainabilityScore=data["explainabilityScore"],
        orgPolicyScore=data["orgPolicyScore"],
        overallScore=_overall_score(scores),
        justification=data["justification"],
    )


async def approve_trust_evaluation(
    tool_id: str, payload: AiTrustEvaluationCreate
) -> AiTrustEvaluationOut:
    pool = get_pool()
    tool = await ai_tool_repository.get_ai_tool(pool, tool_id)
    if tool is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI tool not found.")

    scores = [
        payload.securityScore,
        payload.privacyScore,
        payload.complianceScore,
        payload.availabilityScore,
        payload.explainabilityScore,
        payload.orgPolicyScore,
    ]
    overall_score = _overall_score(scores)

    # TODO: replace with the authenticated admin's user id once real login is wired up.
    reviewer_id = await get_or_create_system_user(pool)

    eval_row = await ai_trust_evaluation_repository.create_trust_evaluation(
        pool,
        ai_tool_id=tool_id,
        security_score=payload.securityScore,
        privacy_score=payload.privacyScore,
        compliance_score=payload.complianceScore,
        availability_score=payload.availabilityScore,
        explainability_score=payload.explainabilityScore,
        org_policy_score=payload.orgPolicyScore,
        overall_score=overall_score,
        evaluated_by_id=reviewer_id,
    )

    await ai_tool_repository.update_ai_tool(
        pool,
        tool_id,
        risk_tier="APPROVED",
        is_approved=True,
        approved_by_id=reviewer_id,
    )

    return AiTrustEvaluationOut(**dict(eval_row))


async def get_latest_trust_evaluation(tool_id: str) -> AiTrustEvaluationOut | None:
    pool = get_pool()
    tool = await ai_tool_repository.get_ai_tool(pool, tool_id)
    if tool is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI tool not found.")

    row = await ai_trust_evaluation_repository.get_latest_trust_evaluation(pool, tool_id)
    return AiTrustEvaluationOut(**dict(row)) if row else None
