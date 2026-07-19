import json

import asyncpg
from fastapi import HTTPException, status

from app.core.security import hash_password
from app.db.pool import get_pool
from app.repositories import audit_log_repository, notification_repository, user_repository
from app.schemas.user import UserCreate, UserOut, UserUpdate


def _user_snapshot(row) -> str:
    return json.dumps(
        {
            "targetRole": row["role"],
            "targetDepartment": row["department"],
            "targetIsActive": row["isActive"],
        }
    )


async def _notify_account_changes(pool, *, before, after) -> None:
    """One combined notification covering whatever actually changed —
    the edit form always resubmits every field, so comparing against the
    pre-update row (rather than just checking which payload fields are
    non-null) is what tells us what's real vs. unchanged."""
    changes: list[str] = []
    if before["role"] != after["role"]:
        changes.append(f'your role is now {after["role"].title()}')
    if before["department"] != after["department"]:
        changes.append(f'your department is now {after["department"]}')
    if before["isActive"] != after["isActive"]:
        changes.append(
            "your account has been reactivated" if after["isActive"] else "your account has been deactivated"
        )

    if not changes:
        return

    await notification_repository.create_notification(
        pool,
        user_id=after["id"],
        title="Your account was updated",
        message="An administrator updated your account: " + "; ".join(changes) + ".",
        notification_type="EMPLOYEE_ACCOUNT_UPDATED",
    )


async def list_users() -> list[UserOut]:
    pool = get_pool()
    rows = await user_repository.list_users(pool)
    return [UserOut(**dict(row)) for row in rows]


async def create_user(payload: UserCreate, actor_id: str) -> UserOut:
    pool = get_pool()

    if await user_repository.email_exists(pool, payload.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    row = await user_repository.create_user(
        pool,
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        department=payload.department,
        role=payload.role,
    )

    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action="Employee Created",
        entity_type="User",
        entity_id=row["id"],
        snapshot=_user_snapshot(row),
    )

    return UserOut(**dict(row))


async def update_user(user_id: str, payload: UserUpdate, actor_id: str) -> UserOut:
    pool = get_pool()
    before = await user_repository.get_user_by_id(pool, user_id)
    row = await user_repository.update_user(
        pool,
        user_id,
        name=payload.name,
        department=payload.department,
        role=payload.role,
        is_active=payload.isActive,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action="Employee Updated",
        entity_type="User",
        entity_id=user_id,
        snapshot=_user_snapshot(row),
    )

    if before is not None:
        await _notify_account_changes(pool, before=before, after=row)

    return UserOut(**dict(row))


async def delete_user(user_id: str, actor_id: str) -> None:
    pool = get_pool()
    # Fetched before deletion — see policy_service.delete_policy for why.
    target = await user_repository.get_user_by_id(pool, user_id)
    try:
        deleted = await user_repository.delete_user(pool, user_id)
    except asyncpg.exceptions.ForeignKeyViolationError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This employee has existing activity (sessions, audit logs, policies, etc.) "
                "and can't be deleted. Deactivate the account instead."
            ),
        ) from exc

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")

    target_name = target["name"] if target else user_id
    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action=f'Employee Removed: "{target_name}"',
        entity_type="User",
        entity_id=user_id,
        snapshot=_user_snapshot(target) if target else None,
    )
