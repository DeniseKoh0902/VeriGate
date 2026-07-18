from fastapi import APIRouter

from app.schemas.compliance import ComplianceOverviewOut
from app.services import compliance_service

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.get("/overview", response_model=ComplianceOverviewOut)
async def get_compliance_overview() -> ComplianceOverviewOut:
    return await compliance_service.get_overview()
