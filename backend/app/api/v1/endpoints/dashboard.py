from fastapi import APIRouter, Depends

from app.core.dependencies import require_roles
from app.schemas.dashboard import DashboardOverviewOut
from app.services import dashboard_service

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(require_roles("ADMIN"))],
)


@router.get("/overview", response_model=DashboardOverviewOut)
async def get_overview() -> DashboardOverviewOut:
    return await dashboard_service.get_overview()
