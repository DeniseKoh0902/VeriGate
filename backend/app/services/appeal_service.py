import time

import asyncpg
from fastapi import HTTPException, status

from app.db.pool import get_pool
from app.repositories import (
    ai_tool_request_repository,
    appeal_repository,
    audit_log_repository,
    notification_repository,
    prompt_repository,
    risk_alert_repository,
)
from app.schemas.appeal import (
    AppealAdminOut,
    AppealCreate,
    AppealOut,
    AppealRequestInfoRequest,
    AppealResolveRequest,
    AppealRespondRequest,
)
from app.schemas.prompt import RiskFindingOut
from app.services import incident_service, prompt_service

# Maps an appeal's sourceType to (how to fetch the underlying record, how to
# describe it). Prisma can't express a real FK across three source tables
# (see the comment on the Appeal model), so this lookup is resolved here at
# the application layer instead.
_SOURCE_LOOKUPS = {
    "PROMPT_BLOCK": (prompt_repository.get_prompt_by_id, incident_service.describe_prompt_block),
    "TOOL_REJECTION": (
        ai_tool_request_repository.get_request_by_id,
        incident_service.describe_tool_rejection,
    ),
    "RISK_ALERT": (risk_alert_repository.get_alert_by_id, incident_service.describe_risk_alert),
}


async def _describe_appeal_source(pool: asyncpg.Pool, appeal: asyncpg.Record) -> incident_service.SourceDescription:
    fetch, describe = _SOURCE_LOOKUPS[appeal["sourceType"]]
    source = await fetch(pool, appeal["sourceId"])
    if source is None:
        return {"title": "(original record no longer available)", "policy": None}
    return describe(source)


async def _resolve_prompt_id(pool: asyncpg.Pool, appeal: asyncpg.Record) -> str | None:
    """RISK_ALERT (and legacy PROMPT_BLOCK) appeals both trace back to a
    Prompt row — RISK_ALERT indirectly via the alert's promptId. Used both to
    unblock an overturned prompt and to surface the original prompt text to
    reviewers in the appeal queue."""
    if appeal["sourceType"] == "PROMPT_BLOCK":
        return appeal["sourceId"]
    if appeal["sourceType"] == "RISK_ALERT":
        alert = await risk_alert_repository.get_alert_by_id(pool, appeal["sourceId"])
        return alert["promptId"] if alert else None
    return None


async def _unblock_prompt_if_overturned(pool: asyncpg.Pool, appeal: asyncpg.Record) -> None:
    """When a prompt-block appeal is overturned, the original decision was a
    false positive: the prompt should have been answered. Generate the AI
    response now so the employee can see it back in the AI Workspace, without
    touching the prompt's BLOCKED status or the compliance/appeal records,
    which stay as-is for audit purposes."""
    prompt_id = await _resolve_prompt_id(pool, appeal)
    if prompt_id is None:
        return

    prompt = await prompt_repository.get_prompt_by_id(pool, prompt_id)
    if prompt is None or prompt["status"] != "BLOCKED":
        return

    if await prompt_repository.get_ai_response_by_prompt_id(pool, prompt_id) is not None:
        return

    start = time.perf_counter()
    response_text = await prompt_service.generate_ai_response(prompt["promptText"])
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    await prompt_repository.create_ai_response(
        pool,
        prompt_id=prompt_id,
        response_text=response_text,
        response_time_ms=elapsed_ms,
    )


async def _to_admin_out(pool: asyncpg.Pool, row: asyncpg.Record) -> AppealAdminOut:
    description = await _describe_appeal_source(pool, row)

    prompt_id = await _resolve_prompt_id(pool, row)
    prompt = await prompt_repository.get_prompt_by_id(pool, prompt_id) if prompt_id else None

    return AppealAdminOut(
        id=row["id"],
        sourceType=row["sourceType"],
        sourceId=row["sourceId"],
        title=description["title"],
        policy=description["policy"],
        employeeName=row["employeeName"],
        employeeEmail=row["employeeEmail"],
        justification=row["justification"],
        evidenceUrl=row["evidenceUrl"],
        status=row["status"],
        resolution=row["resolution"],
        resolutionNotes=row["resolutionNotes"],
        additionalInfoRequest=row["additionalInfoRequest"],
        employeeResponse=row["employeeResponse"],
        slaDeadline=row["slaDeadline"],
        createdAt=row["createdAt"],
        resolvedAt=row["resolvedAt"],
        promptText=prompt["promptText"] if prompt else None,
        riskFindings=[
            RiskFindingOut(category=f["category"], riskLevel=f["riskLevel"], note=f["note"])
            for f in prompt["riskFindings"]
        ]
        if prompt
        else [],
    )


async def list_all_appeals() -> list[AppealAdminOut]:
    pool = get_pool()
    rows = await appeal_repository.list_all_appeals(pool)
    return [await _to_admin_out(pool, row) for row in rows]


async def resolve_appeal(
    appeal_id: str, payload: AppealResolveRequest, reviewer_id: str
) -> AppealAdminOut:
    pool = get_pool()
    row = await appeal_repository.resolve_appeal(
        pool,
        appeal_id,
        resolution=payload.resolution,
        resolution_notes=payload.resolutionNotes,
        reviewed_by_id=reviewer_id,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appeal not found.")

    if row["resolution"] == "OVERTURNED":
        await _unblock_prompt_if_overturned(pool, row)

    await audit_log_repository.create_audit_log(
        pool,
        user_id=reviewer_id,
        action=f"Appeal {row['resolution'].title()}",
        entity_type="Appeal",
        entity_id=appeal_id,
    )

    return await _to_admin_out(pool, row)


async def request_more_info(
    appeal_id: str, payload: AppealRequestInfoRequest, reviewer_id: str
) -> AppealAdminOut:
    pool = get_pool()
    row = await appeal_repository.request_more_info(
        pool,
        appeal_id,
        message=payload.message,
        requested_by_id=reviewer_id,
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appeal not found, or it has already been resolved.",
        )

    await notification_repository.create_notification(
        pool,
        user_id=row["userId"],
        title="Your appeal requires additional information",
        message=payload.message,
        notification_type="APPEAL_INFO_REQUESTED",
        related_entity_type="Appeal",
        related_entity_id=appeal_id,
    )

    await audit_log_repository.create_audit_log(
        pool,
        user_id=reviewer_id,
        action="Appeal Info Requested",
        entity_type="Appeal",
        entity_id=appeal_id,
    )

    return await _to_admin_out(pool, row)


async def respond_to_info_request(
    appeal_id: str, payload: AppealRespondRequest, user_id: str
) -> AppealOut:
    pool = get_pool()
    row = await appeal_repository.respond_to_info_request(
        pool,
        appeal_id,
        user_id=user_id,
        response=payload.response,
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This appeal isn't awaiting additional information from you.",
        )

    await audit_log_repository.create_audit_log(
        pool,
        user_id=user_id,
        action="Appeal Response Submitted",
        entity_type="Appeal",
        entity_id=appeal_id,
    )

    return AppealOut(**dict(row))


async def list_my_appeals(user_id: str) -> list[AppealOut]:
    pool = get_pool()
    rows = await appeal_repository.list_appeals_by_user(pool, user_id)
    return [AppealOut(**dict(row)) for row in rows]


async def create_appeal(payload: AppealCreate, user_id: str) -> AppealOut:
    pool = get_pool()

    belongs_to_user = await appeal_repository.source_belongs_to_user(
        pool, source_type=payload.sourceType, source_id=payload.sourceId, user_id=user_id
    )
    if not belongs_to_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The item you're trying to appeal was not found.",
        )

    existing = await appeal_repository.get_appeal_by_source(
        pool, user_id=user_id, source_type=payload.sourceType, source_id=payload.sourceId
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An appeal has already been filed for this item.",
        )

    row = await appeal_repository.create_appeal(
        pool,
        user_id=user_id,
        source_type=payload.sourceType,
        source_id=payload.sourceId,
        justification=payload.justification,
        evidence_url=payload.evidenceUrl,
    )

    await audit_log_repository.create_audit_log(
        pool,
        user_id=user_id,
        action="Appeal Submitted",
        entity_type="Appeal",
        entity_id=row["id"],
    )

    return AppealOut(**dict(row))
