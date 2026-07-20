from fastapi import APIRouter, Depends, status

from app.core.dependencies import require_roles
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
from app.schemas.user import UserOut
from app.services import policy_service

router = APIRouter(
    prefix="/policies",
    tags=["policies"],
    dependencies=[Depends(require_roles("ADMIN"))],
)

_require_admin = require_roles("ADMIN")


# Static "/sensitive-data-rules..." paths are registered before the
# parameterized "/{policy_id}" routes below, so a dynamic policy_id segment
# can never shadow them.
@router.get("/sensitive-data-rules", response_model=list[SensitiveDataRuleOut])
async def get_sensitive_data_rules() -> list[SensitiveDataRuleOut]:
    return await policy_service.list_sensitive_data_rules()


@router.post(
    "/sensitive-data-rules",
    response_model=SensitiveDataRuleOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_sensitive_data_rule(
    payload: SensitiveDataRuleCreate,
    current_user: UserOut = Depends(_require_admin),
) -> SensitiveDataRuleOut:
    return await policy_service.create_sensitive_data_rule(payload, current_user.id)


@router.patch("/sensitive-data-rules/{rule_id}", response_model=SensitiveDataRuleOut)
async def update_sensitive_data_rule(
    rule_id: str,
    payload: SensitiveDataRuleUpdate,
    current_user: UserOut = Depends(_require_admin),
) -> SensitiveDataRuleOut:
    return await policy_service.update_sensitive_data_rule(rule_id, payload, current_user.id)


@router.delete("/sensitive-data-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sensitive_data_rule(
    rule_id: str, current_user: UserOut = Depends(_require_admin)
) -> None:
    await policy_service.delete_sensitive_data_rule(rule_id, current_user.id)


@router.get("/use-case-policies", response_model=list[UseCasePolicyOut])
async def get_use_case_policies() -> list[UseCasePolicyOut]:
    return await policy_service.list_use_case_policies()


@router.post(
    "/use-case-policies",
    response_model=UseCasePolicyOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_use_case_policy(
    payload: UseCasePolicyCreate,
    current_user: UserOut = Depends(_require_admin),
) -> UseCasePolicyOut:
    return await policy_service.create_use_case_policy(payload, current_user.id)


@router.patch("/use-case-policies/{policy_id}", response_model=UseCasePolicyOut)
async def update_use_case_policy(
    policy_id: str,
    payload: UseCasePolicyUpdate,
    current_user: UserOut = Depends(_require_admin),
) -> UseCasePolicyOut:
    return await policy_service.update_use_case_policy(policy_id, payload, current_user.id)


@router.delete("/use-case-policies/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_use_case_policy(
    policy_id: str, current_user: UserOut = Depends(_require_admin)
) -> None:
    await policy_service.delete_use_case_policy(policy_id, current_user.id)


@router.get("/tool-tier-policies", response_model=list[ToolTierPolicyOut])
async def get_tool_tier_policies() -> list[ToolTierPolicyOut]:
    return await policy_service.list_tool_tier_policies()


@router.post(
    "/tool-tier-policies",
    response_model=ToolTierPolicyOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_tool_tier_policy(
    payload: ToolTierPolicyCreate,
    current_user: UserOut = Depends(_require_admin),
) -> ToolTierPolicyOut:
    return await policy_service.create_tool_tier_policy(payload, current_user.id)


@router.patch("/tool-tier-policies/{policy_id}", response_model=ToolTierPolicyOut)
async def update_tool_tier_policy(
    policy_id: str,
    payload: ToolTierPolicyUpdate,
    current_user: UserOut = Depends(_require_admin),
) -> ToolTierPolicyOut:
    return await policy_service.update_tool_tier_policy(policy_id, payload, current_user.id)


@router.delete("/tool-tier-policies/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tool_tier_policy(
    policy_id: str, current_user: UserOut = Depends(_require_admin)
) -> None:
    await policy_service.delete_tool_tier_policy(policy_id, current_user.id)


@router.get("", response_model=list[PolicyOut])
async def get_policies() -> list[PolicyOut]:
    return await policy_service.list_policies()


@router.post("", response_model=PolicyOut, status_code=status.HTTP_201_CREATED)
async def create_policy(
    payload: PolicyCreate, current_user: UserOut = Depends(_require_admin)
) -> PolicyOut:
    return await policy_service.create_policy(payload, current_user.id)


@router.patch("/{policy_id}", response_model=PolicyOut)
async def update_policy(
    policy_id: str, payload: PolicyUpdate, current_user: UserOut = Depends(_require_admin)
) -> PolicyOut:
    return await policy_service.update_policy(policy_id, payload, current_user.id)


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_policy(
    policy_id: str, current_user: UserOut = Depends(_require_admin)
) -> None:
    await policy_service.delete_policy(policy_id, current_user.id)
