import json
import logging
from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException, status
from google.genai import errors, types
from pydantic import BaseModel

from app.core.gemini_client import get_gemini_client
from app.db.pool import get_pool
from app.repositories import audit_log_repository, policy_recommendation_repository
from app.schemas.policy import PolicyCreate
from app.schemas.policy_recommendation import PolicyRecommendationModify, PolicyRecommendationOut
from app.services import policy_service

logger = logging.getLogger(__name__)

_MODEL = "gemini-flash-lite-latest"
_LOOKBACK_DAYS = 30
_MAX_NEW_RECOMMENDATIONS = 5

# Default severity assigned to the Policy created when a recommendation is
# accepted/modified — recommendations don't carry their own severity, and
# Medium matches the Policy Management form's own default.
_DEFAULT_POLICY_SEVERITY = "Medium"

# Policy Management's own create/edit form stores this literal string (not
# SQL NULL) for an org-wide policy's appliesToDepartment — matched here so a
# recommendation's org-wide scope is represented identically whether the
# resulting Policy was created by hand or accepted/modified from here.
_ALL_DEPARTMENTS = "All Departments"

_SYSTEM_INSTRUCTION = (
    "You are VeriGate's AI Policy Recommendation engine, generating governance "
    "policy suggestions for enterprise IT/compliance teams from real usage and "
    "risk data. You will be given recent department alert/blocked-prompt stats, "
    "the most frequent risk alert types, AI tool risk-tier and trust-evaluation "
    "data, and the titles of recommendations already pending review. "
    f"Recommend up to {_MAX_NEW_RECOMMENDATIONS} NEW policy changes that are not "
    "duplicates of the pending titles, each grounded in a specific pattern in the "
    "given data (a department, alert type, or tool) — never invent a statistic "
    "that isn't present in the data. If the data doesn't support any new "
    "recommendation, return an empty array. "
    "Each recommendation needs a title (short, actionable), a rationale (1-2 "
    "sentences citing the specific data point behind it), an optional department "
    "(omit for an org-wide recommendation), and a confidenceScore from 0-100 "
    "reflecting how strongly the data supports it."
)


class _GeneratedRecommendation(BaseModel):
    title: str
    rationale: str
    department: str | None = None
    confidenceScore: int


def _jsonable(value: object) -> object:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _record_to_dict(record: object) -> dict:
    return {key: _jsonable(value) for key, value in dict(record).items()}


async def list_recommendations() -> list[PolicyRecommendationOut]:
    pool = get_pool()
    rows = await policy_recommendation_repository.list_all(pool)
    return [PolicyRecommendationOut(**dict(row)) for row in rows]


async def generate_recommendations(actor_id: str) -> list[PolicyRecommendationOut]:
    pool = get_pool()
    department_stats = await policy_recommendation_repository.get_department_alert_stats(
        pool, days=_LOOKBACK_DAYS
    )
    top_alert_types = await policy_recommendation_repository.get_top_alert_types(
        pool, days=_LOOKBACK_DAYS, limit=8
    )
    tool_risk = await policy_recommendation_repository.get_tool_risk_snapshot(pool)
    pending = await policy_recommendation_repository.list_all(pool, status="PENDING")

    context = {
        "departmentAlertStats": [_record_to_dict(r) for r in department_stats],
        "topAlertTypes": [_record_to_dict(r) for r in top_alert_types],
        "aiToolRisk": [_record_to_dict(r) for r in tool_risk],
        "pendingRecommendationTitles": [r["title"] for r in pending],
    }
    prompt = (
        f"Governance data from the last {_LOOKBACK_DAYS} days:\n"
        f"{json.dumps(context, indent=2)}\n\n"
        "Generate the recommendations now."
    )

    config = types.GenerateContentConfig(
        system_instruction=_SYSTEM_INSTRUCTION,
        response_mime_type="application/json",
        response_schema=list[_GeneratedRecommendation],
    )

    try:
        response = await get_gemini_client().aio.models.generate_content(
            model=_MODEL, contents=prompt, config=config
        )
    except errors.APIError as error:
        logger.error("Gemini API error (code=%s): %s", error.code, error.message)
        if error.code == 429:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Recommendation generation is getting a lot of requests right now — wait a moment and try again.",
            ) from error
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Policy recommendation generation is temporarily unavailable.",
        ) from error

    generated: list[_GeneratedRecommendation] = response.parsed or []
    existing_titles = {r["title"].strip().lower() for r in pending}

    created: list[PolicyRecommendationOut] = []
    for item in generated[:_MAX_NEW_RECOMMENDATIONS]:
        title = item.title.strip()
        rationale = item.rationale.strip()
        if not title or not rationale or title.lower() in existing_titles:
            continue
        existing_titles.add(title.lower())

        row = await policy_recommendation_repository.create_recommendation(
            pool,
            title=title,
            rationale=rationale,
            department=item.department.strip() if item.department else _ALL_DEPARTMENTS,
            confidence_score=max(0, min(100, item.confidenceScore)),
        )
        await audit_log_repository.create_audit_log(
            pool,
            user_id=actor_id,
            action="Policy Recommendation Generated",
            entity_type="PolicyRecommendation",
            entity_id=row["id"],
        )
        created.append(PolicyRecommendationOut(**dict(row)))

    return created


async def _get_pending_or_error(pool, recommendation_id: str):
    row = await policy_recommendation_repository.get_by_id(pool, recommendation_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Policy recommendation not found."
        )
    if row["status"] != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This recommendation has already been reviewed.",
        )
    return row


async def accept_recommendation(recommendation_id: str, actor_id: str) -> PolicyRecommendationOut:
    pool = get_pool()
    row = await _get_pending_or_error(pool, recommendation_id)

    await policy_service.create_policy(
        PolicyCreate(
            name=row["title"],
            description=row["rationale"],
            severity=_DEFAULT_POLICY_SEVERITY,
            appliesToDepartment=row["department"] or _ALL_DEPARTMENTS,
        ),
        actor_id,
    )

    updated = await policy_recommendation_repository.update_review(
        pool, recommendation_id, status="ACCEPTED", reviewed_by_id=actor_id
    )
    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action="Policy Recommendation Accepted",
        entity_type="PolicyRecommendation",
        entity_id=recommendation_id,
    )
    return PolicyRecommendationOut(**dict(updated))


async def modify_recommendation(
    recommendation_id: str, payload: PolicyRecommendationModify, actor_id: str
) -> PolicyRecommendationOut:
    pool = get_pool()
    row = await _get_pending_or_error(pool, recommendation_id)

    await policy_service.create_policy(
        PolicyCreate(
            name=payload.title,
            description=payload.rationale,
            severity=_DEFAULT_POLICY_SEVERITY,
            appliesToDepartment=row["department"] or _ALL_DEPARTMENTS,
        ),
        actor_id,
    )

    updated = await policy_recommendation_repository.update_review(
        pool,
        recommendation_id,
        status="MODIFIED",
        reviewed_by_id=actor_id,
        title=payload.title,
        rationale=payload.rationale,
    )
    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action="Policy Recommendation Modified",
        entity_type="PolicyRecommendation",
        entity_id=recommendation_id,
    )
    return PolicyRecommendationOut(**dict(updated))


async def reject_recommendation(recommendation_id: str, actor_id: str) -> PolicyRecommendationOut:
    pool = get_pool()
    await _get_pending_or_error(pool, recommendation_id)

    updated = await policy_recommendation_repository.update_review(
        pool, recommendation_id, status="REJECTED", reviewed_by_id=actor_id
    )
    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action="Policy Recommendation Rejected",
        entity_type="PolicyRecommendation",
        entity_id=recommendation_id,
    )
    return PolicyRecommendationOut(**dict(updated))
