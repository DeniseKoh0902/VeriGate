from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.schemas.compliance import ComplianceOverviewOut
from app.schemas.user import UserOut
from app.services import compliance_service

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.get("/overview", response_model=ComplianceOverviewOut)
async def get_compliance_overview(
    current_user: UserOut = Depends(get_current_user),
) -> ComplianceOverviewOut:
    return await compliance_service.get_overview(current_user.id)
