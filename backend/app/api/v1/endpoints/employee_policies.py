from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.schemas.policy import PolicyOut, SensitiveDataRuleOut, UseCasePolicyOut
from app.schemas.user import UserOut
from app.services import policy_service

# Deliberately its own router rather than routes bolted onto policies.py —
# that router requires ADMIN for everything registered on it, which would
# lock employees out. This just requires being logged in, same as
# compliance.py's employee-facing "my own data" endpoints.
router = APIRouter(prefix="/my-policies", tags=["employee-policies"])


@router.get("", response_model=list[PolicyOut])
async def get_my_policies(current_user: UserOut = Depends(get_current_user)) -> list[PolicyOut]:
    return await policy_service.list_policies_for_employee(current_user.department)


@router.get("/sensitive-data-rules", response_model=list[SensitiveDataRuleOut])
async def get_active_sensitive_data_rules(
    current_user: UserOut = Depends(get_current_user),
) -> list[SensitiveDataRuleOut]:
    return await policy_service.list_active_sensitive_data_rules()


@router.get("/use-case-policies", response_model=list[UseCasePolicyOut])
async def get_active_use_case_policies(
    current_user: UserOut = Depends(get_current_user),
) -> list[UseCasePolicyOut]:
    return await policy_service.list_active_use_case_policies()
