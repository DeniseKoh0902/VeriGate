from fastapi import HTTPException, status

from app.db.pool import get_pool
from app.repositories import policy_repository, sensitive_data_rule_repository
from app.repositories.user_repository import get_or_create_system_user
from app.schemas.policy import (
    PolicyCreate,
    PolicyOut,
    PolicyUpdate,
    SensitiveDataRuleCreate,
    SensitiveDataRuleOut,
    SensitiveDataRuleUpdate,
)


async def list_policies() -> list[PolicyOut]:
    pool = get_pool()
    rows = await policy_repository.list_policies(pool)
    return [PolicyOut(**dict(row)) for row in rows]


async def create_policy(payload: PolicyCreate) -> PolicyOut:
    pool = get_pool()
    # TODO: replace with the authenticated admin's user id once real login is wired up.
    created_by_id = await get_or_create_system_user(pool)
    row = await policy_repository.create_policy(
        pool,
        name=payload.name,
        description=payload.description,
        severity=payload.severity,
        applies_to_department=payload.appliesToDepartment,
        created_by_id=created_by_id,
    )
    return PolicyOut(**dict(row))


async def update_policy(policy_id: str, payload: PolicyUpdate) -> PolicyOut:
    pool = get_pool()
    row = await policy_repository.update_policy(
        pool,
        policy_id,
        name=payload.name,
        description=payload.description,
        severity=payload.severity,
        applies_to_department=payload.appliesToDepartment,
        is_active=payload.isActive,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found.")
    return PolicyOut(**dict(row))


async def delete_policy(policy_id: str) -> None:
    pool = get_pool()
    deleted = await policy_repository.delete_policy(pool, policy_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found.")


async def list_sensitive_data_rules() -> list[SensitiveDataRuleOut]:
    pool = get_pool()
    rows = await sensitive_data_rule_repository.list_sensitive_data_rules(pool)
    return [SensitiveDataRuleOut(**dict(row)) for row in rows]


async def create_sensitive_data_rule(payload: SensitiveDataRuleCreate) -> SensitiveDataRuleOut:
    pool = get_pool()
    created_by_id = await get_or_create_system_user(pool)
    row = await sensitive_data_rule_repository.create_sensitive_data_rule(
        pool,
        category=payload.category,
        risk_level=payload.riskLevel,
        action=payload.action,
        created_by_id=created_by_id,
    )
    return SensitiveDataRuleOut(**dict(row))


async def update_sensitive_data_rule(
    rule_id: str, payload: SensitiveDataRuleUpdate
) -> SensitiveDataRuleOut:
    pool = get_pool()
    row = await sensitive_data_rule_repository.update_sensitive_data_rule(
        pool,
        rule_id,
        category=payload.category,
        risk_level=payload.riskLevel,
        action=payload.action,
        is_active=payload.isActive,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found.")
    return SensitiveDataRuleOut(**dict(row))


async def delete_sensitive_data_rule(rule_id: str) -> None:
    pool = get_pool()
    deleted = await sensitive_data_rule_repository.delete_sensitive_data_rule(pool, rule_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found.")
