import json

from fastapi import HTTPException, status

from app.db.pool import get_pool
from app.repositories import (
    audit_log_repository,
    notification_repository,
    policy_repository,
    sensitive_data_rule_repository,
    tool_tier_policy_repository,
    use_case_policy_repository,
    user_repository,
)
from app.schemas.policy import (
    PolicyCreate,
    PolicyOut,
    PolicyUpdate,
    SensitiveDataRuleCreate,
    SensitiveDataRuleOut,
    SensitiveDataRuleUpdate,
    ToolTierPolicyCreate,
    ToolTierPolicyOut,
    ToolTierPolicyUpdate,
    UseCasePolicyCreate,
    UseCasePolicyOut,
    UseCasePolicyUpdate,
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


def _use_case_policy_snapshot(row) -> str:
    return json.dumps(
        {
            "useCase": row["useCase"],
            "description": row["description"],
            "riskLevel": row["riskLevel"],
            "ruleAction": row["action"],
            "minConfidence": row["minConfidence"],
        }
    )


def _tool_tier_policy_snapshot(row) -> str:
    return json.dumps(
        {
            "toolTier": row["toolTier"],
            "aiToolName": row["aiToolName"],
            "category": row["category"],
            "riskLevel": row["riskLevel"],
            "ruleAction": row["action"],
        }
    )


async def _notify_affected_employees(pool, policy_row) -> None:
    department = policy_row["appliesToDepartment"]
    if department is None or department == "All Departments":
        employees = await user_repository.list_all_active_employees(pool)
    else:
        employees = await user_repository.list_active_employees_by_department(pool, department)

    for employee in employees:
        await notification_repository.create_notification(
            pool,
            user_id=employee["id"],
            title=f'New policy: "{policy_row["name"]}"',
            message=policy_row["description"] or "A new governance policy now applies to you.",
            notification_type="POLICY_CREATED",
            related_entity_type="Policy",
            related_entity_id=policy_row["id"],
        )


async def list_policies() -> list[PolicyOut]:
    pool = get_pool()
    rows = await policy_repository.list_policies(pool)
    return [PolicyOut(**dict(row)) for row in rows]


async def list_policies_for_employee(department: str) -> list[PolicyOut]:
    pool = get_pool()
    rows = await policy_repository.list_active_policies_for_department(pool, department)
    return [PolicyOut(**dict(row)) for row in rows]


async def list_active_sensitive_data_rules() -> list[SensitiveDataRuleOut]:
    pool = get_pool()
    rows = await sensitive_data_rule_repository.list_active_rules(pool)
    return [SensitiveDataRuleOut(**dict(row)) for row in rows]


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

    await _notify_affected_employees(pool, row)

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


async def list_use_case_policies() -> list[UseCasePolicyOut]:
    pool = get_pool()
    rows = await use_case_policy_repository.list_use_case_policies(pool)
    return [UseCasePolicyOut(**dict(row)) for row in rows]


async def list_active_use_case_policies() -> list[UseCasePolicyOut]:
    pool = get_pool()
    rows = await use_case_policy_repository.list_active_policies(pool)
    return [UseCasePolicyOut(**dict(row)) for row in rows]


async def create_use_case_policy(
    payload: UseCasePolicyCreate, created_by_id: str
) -> UseCasePolicyOut:
    pool = get_pool()
    row = await use_case_policy_repository.create_use_case_policy(
        pool,
        use_case=payload.useCase,
        description=payload.description,
        risk_level=payload.riskLevel,
        action=payload.action,
        min_confidence=payload.minConfidence,
        created_by_id=created_by_id,
    )

    await audit_log_repository.create_audit_log(
        pool,
        user_id=created_by_id,
        action="Use Case Policy Created",
        entity_type="UseCasePolicy",
        entity_id=row["id"],
        snapshot=_use_case_policy_snapshot(row),
    )

    return UseCasePolicyOut(**dict(row))


async def update_use_case_policy(
    policy_id: str, payload: UseCasePolicyUpdate, actor_id: str
) -> UseCasePolicyOut:
    pool = get_pool()
    row = await use_case_policy_repository.update_use_case_policy(
        pool,
        policy_id,
        use_case=payload.useCase,
        description=payload.description,
        risk_level=payload.riskLevel,
        action=payload.action,
        min_confidence=payload.minConfidence,
        is_active=payload.isActive,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Use case policy not found.")

    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action="Use Case Policy Updated",
        entity_type="UseCasePolicy",
        entity_id=policy_id,
        snapshot=_use_case_policy_snapshot(row),
    )

    return UseCasePolicyOut(**dict(row))


async def delete_use_case_policy(policy_id: str, actor_id: str) -> None:
    pool = get_pool()
    # Fetched before deletion — see delete_policy for why.
    policy = await use_case_policy_repository.get_policy_by_id(pool, policy_id)
    deleted = await use_case_policy_repository.delete_use_case_policy(pool, policy_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Use case policy not found.")

    use_case = policy["useCase"] if policy else policy_id
    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action=f'Use Case Policy Removed: "{use_case}"',
        entity_type="UseCasePolicy",
        entity_id=policy_id,
        snapshot=_use_case_policy_snapshot(policy) if policy else None,
    )


async def list_tool_tier_policies() -> list[ToolTierPolicyOut]:
    pool = get_pool()
    rows = await tool_tier_policy_repository.list_tool_tier_policies(pool)
    return [ToolTierPolicyOut(**dict(row)) for row in rows]


async def create_tool_tier_policy(
    payload: ToolTierPolicyCreate, created_by_id: str
) -> ToolTierPolicyOut:
    pool = get_pool()
    row = await tool_tier_policy_repository.create_tool_tier_policy(
        pool,
        tool_tier=payload.toolTier,
        ai_tool_id=payload.aiToolId,
        category=payload.category,
        risk_level=payload.riskLevel,
        action=payload.action,
        created_by_id=created_by_id,
    )

    await audit_log_repository.create_audit_log(
        pool,
        user_id=created_by_id,
        action="Tool Tier Policy Created",
        entity_type="ToolTierPolicy",
        entity_id=row["id"],
        snapshot=_tool_tier_policy_snapshot(row),
    )

    return ToolTierPolicyOut(**dict(row))


async def update_tool_tier_policy(
    policy_id: str, payload: ToolTierPolicyUpdate, actor_id: str
) -> ToolTierPolicyOut:
    pool = get_pool()
    row = await tool_tier_policy_repository.update_tool_tier_policy(
        pool,
        policy_id,
        tool_tier=payload.toolTier,
        ai_tool_id=payload.aiToolId,
        category=payload.category,
        risk_level=payload.riskLevel,
        action=payload.action,
        is_active=payload.isActive,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tool tier policy not found.")

    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action="Tool Tier Policy Updated",
        entity_type="ToolTierPolicy",
        entity_id=policy_id,
        snapshot=_tool_tier_policy_snapshot(row),
    )

    return ToolTierPolicyOut(**dict(row))


async def delete_tool_tier_policy(policy_id: str, actor_id: str) -> None:
    pool = get_pool()
    # Fetched before deletion (via the joined admin select, since the
    # snapshot below includes aiToolName) — see delete_policy for why.
    policy = await tool_tier_policy_repository.get_admin_policy_by_id(pool, policy_id)
    deleted = await tool_tier_policy_repository.delete_tool_tier_policy(pool, policy_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tool tier policy not found.")

    category = policy["category"] if policy else policy_id
    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action=f'Tool Tier Policy Removed: "{category}"',
        entity_type="ToolTierPolicy",
        entity_id=policy_id,
        snapshot=_tool_tier_policy_snapshot(policy) if policy else None,
    )
