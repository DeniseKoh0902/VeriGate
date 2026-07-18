import asyncpg
from fastapi import HTTPException, status

from app.db.pool import get_pool
from app.repositories import ai_tool_request_repository, appeal_repository, prompt_repository, risk_alert_repository
from app.schemas.appeal import AppealAdminOut, AppealCreate, AppealOut, AppealResolveRequest
from app.services import incident_service

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


async def _to_admin_out(pool: asyncpg.Pool, row: asyncpg.Record) -> AppealAdminOut:
    description = await _describe_appeal_source(pool, row)
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
        slaDeadline=row["slaDeadline"],
        createdAt=row["createdAt"],
        resolvedAt=row["resolvedAt"],
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
    return await _to_admin_out(pool, row)


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
    return AppealOut(**dict(row))
