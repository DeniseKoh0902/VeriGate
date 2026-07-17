from fastapi import HTTPException, status

from app.db.pool import get_pool
from app.repositories import appeal_repository
from app.repositories.user_repository import get_or_create_demo_employee
from app.schemas.appeal import AppealCreate, AppealOut


async def list_my_appeals() -> list[AppealOut]:
    pool = get_pool()
    # TODO: replace with the authenticated employee's user id once real login is wired up.
    user_id = await get_or_create_demo_employee(pool)
    rows = await appeal_repository.list_appeals_by_user(pool, user_id)
    return [AppealOut(**dict(row)) for row in rows]


async def create_appeal(payload: AppealCreate) -> AppealOut:
    pool = get_pool()
    # TODO: replace with the authenticated employee's user id once real login is wired up.
    user_id = await get_or_create_demo_employee(pool)

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
