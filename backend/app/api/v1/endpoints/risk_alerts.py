from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_current_user, require_roles
from app.schemas.risk_alert import RiskAlertAdminOut, ShadowAiDetectionCreate
from app.schemas.user import UserOut
from app.services import risk_alert_service

router = APIRouter(prefix="/risk-alerts", tags=["risk-alerts"])

_require_admin = require_roles("ADMIN")


@router.get("", response_model=list[RiskAlertAdminOut])
async def get_all_alerts(
    current_user: UserOut = Depends(_require_admin),
) -> list[RiskAlertAdminOut]:
    return await risk_alert_service.list_all_alerts()


@router.post("/shadow-ai", status_code=status.HTTP_204_NO_CONTENT)
async def report_shadow_ai(
    payload: ShadowAiDetectionCreate,
    current_user: UserOut = Depends(get_current_user),
) -> None:
    await risk_alert_service.report_shadow_ai(current_user.id, payload.domain, payload.pageUrl)


@router.patch("/{alert_id}/resolve", response_model=RiskAlertAdminOut)
async def resolve_alert(
    alert_id: str, current_user: UserOut = Depends(_require_admin)
) -> RiskAlertAdminOut:
    return await risk_alert_service.resolve_alert(alert_id, current_user.id)


@router.patch("/{alert_id}/escalate", response_model=RiskAlertAdminOut)
async def escalate_alert(
    alert_id: str, current_user: UserOut = Depends(_require_admin)
) -> RiskAlertAdminOut:
    return await risk_alert_service.escalate_alert(alert_id, current_user.id)
