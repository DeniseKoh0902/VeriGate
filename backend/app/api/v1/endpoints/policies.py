from fastapi import APIRouter, status

from app.schemas.policy import (
    PolicyCreate,
    PolicyOut,
    PolicyUpdate,
    SensitiveDataRuleCreate,
    SensitiveDataRuleOut,
    SensitiveDataRuleUpdate,
)
from app.services import policy_service

router = APIRouter(prefix="/policies", tags=["policies"])


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
async def create_sensitive_data_rule(payload: SensitiveDataRuleCreate) -> SensitiveDataRuleOut:
    return await policy_service.create_sensitive_data_rule(payload)


@router.patch("/sensitive-data-rules/{rule_id}", response_model=SensitiveDataRuleOut)
async def update_sensitive_data_rule(
    rule_id: str, payload: SensitiveDataRuleUpdate
) -> SensitiveDataRuleOut:
    return await policy_service.update_sensitive_data_rule(rule_id, payload)


@router.delete("/sensitive-data-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sensitive_data_rule(rule_id: str) -> None:
    await policy_service.delete_sensitive_data_rule(rule_id)


@router.get("", response_model=list[PolicyOut])
async def get_policies() -> list[PolicyOut]:
    return await policy_service.list_policies()


@router.post("", response_model=PolicyOut, status_code=status.HTTP_201_CREATED)
async def create_policy(payload: PolicyCreate) -> PolicyOut:
    return await policy_service.create_policy(payload)


@router.patch("/{policy_id}", response_model=PolicyOut)
async def update_policy(policy_id: str, payload: PolicyUpdate) -> PolicyOut:
    return await policy_service.update_policy(policy_id, payload)


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_policy(policy_id: str) -> None:
    await policy_service.delete_policy(policy_id)
