import json

from fastapi import HTTPException, status

from app.db.pool import get_pool
from app.repositories import audit_log_repository, policy_repository, sensitive_data_rule_repository
from app.schemas.policy import (
    PolicyCreate,
    PolicyOut,
    PolicyUpdate,
    SensitiveDataRuleCreate,
    SensitiveDataRuleOut,
    SensitiveDataRuleUpdate,
)


def _policy_snapshot(row) -> str:
    return json.dumps(
        {
            "policyName": row["name"],
            "description": row["description"],
            "severity": row["severity"],
            "appliesToDepartment": row["appliesToDepartment"],
        }
    )


def _rule_snapshot(row) -> str:
    return json.dumps(
        {
            "category": row["category"],
            "riskLevel": row["riskLevel"],
            "ruleAction": row["action"],
        }
    )


async def list_policies() -> list[PolicyOut]:
    pool = get_pool()
    rows = await policy_repository.list_policies(pool)
    return [PolicyOut(**dict(row)) for row in rows]


async def create_policy(payload: PolicyCreate, created_by_id: str) -> PolicyOut:
    pool = get_pool()
    row = await policy_repository.create_policy(
        pool,
        name=payload.name,
        description=payload.description,
        severity=payload.severity,
        applies_to_department=payload.appliesToDepartment,
        created_by_id=created_by_id,
    )

    await audit_log_repository.create_audit_log(
        pool,
        user_id=created_by_id,
        action="Policy Created",
        entity_type="Policy",
        entity_id=row["id"],
        snapshot=_policy_snapshot(row),
    )

    return PolicyOut(**dict(row))


async def update_policy(policy_id: str, payload: PolicyUpdate, actor_id: str) -> PolicyOut:
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

    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action="Policy Updated",
        entity_type="Policy",
        entity_id=policy_id,
        snapshot=_policy_snapshot(row),
    )

    return PolicyOut(**dict(row))


async def delete_policy(policy_id: str, actor_id: str) -> None:
    pool = get_pool()
    # Fetched before deletion: once the row is gone, there's nothing left to
    # look up live for the audit log's "View Details" panel, so a snapshot of
    # its detail fields is captured into the log now, while it still exists.
    policy = await policy_repository.get_policy_by_id(pool, policy_id)
    deleted = await policy_repository.delete_policy(pool, policy_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found.")

    policy_name = policy["name"] if policy else policy_id
    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action=f'Policy Removed: "{policy_name}"',
        entity_type="Policy",
        entity_id=policy_id,
        snapshot=_policy_snapshot(policy) if policy else None,
    )


async def list_sensitive_data_rules() -> list[SensitiveDataRuleOut]:
    pool = get_pool()
    rows = await sensitive_data_rule_repository.list_sensitive_data_rules(pool)
    return [SensitiveDataRuleOut(**dict(row)) for row in rows]


async def create_sensitive_data_rule(
    payload: SensitiveDataRuleCreate, created_by_id: str
) -> SensitiveDataRuleOut:
    pool = get_pool()
    row = await sensitive_data_rule_repository.create_sensitive_data_rule(
        pool,
        category=payload.category,
        risk_level=payload.riskLevel,
        action=payload.action,
        created_by_id=created_by_id,
    )

    await audit_log_repository.create_audit_log(
        pool,
        user_id=created_by_id,
        action="Sensitive Data Rule Created",
        entity_type="SensitiveDataRule",
        entity_id=row["id"],
        snapshot=_rule_snapshot(row),
    )

    return SensitiveDataRuleOut(**dict(row))


async def update_sensitive_data_rule(
    rule_id: str, payload: SensitiveDataRuleUpdate, actor_id: str
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

    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action="Sensitive Data Rule Updated",
        entity_type="SensitiveDataRule",
        entity_id=rule_id,
        snapshot=_rule_snapshot(row),
    )

    return SensitiveDataRuleOut(**dict(row))


async def delete_sensitive_data_rule(rule_id: str, actor_id: str) -> None:
    pool = get_pool()
    # Fetched before deletion — see delete_policy for why.
    rule = await sensitive_data_rule_repository.get_rule_by_id(pool, rule_id)
    deleted = await sensitive_data_rule_repository.delete_sensitive_data_rule(pool, rule_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found.")

    rule_category = rule["category"] if rule else rule_id
    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action=f'Sensitive Data Rule Removed: "{rule_category}"',
        entity_type="SensitiveDataRule",
        entity_id=rule_id,
        snapshot=_rule_snapshot(rule) if rule else None,
    )
