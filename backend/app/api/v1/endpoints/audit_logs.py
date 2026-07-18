from fastapi import APIRouter, Depends

from app.core.dependencies import require_roles
from app.schemas.audit_log import AuditLogDetailOut, AuditLogOut
from app.services import audit_log_service

router = APIRouter(
    prefix="/audit-logs",
    tags=["audit-logs"],
    dependencies=[Depends(require_roles("ADMIN", "COMPLIANCE"))],
)


@router.get("", response_model=list[AuditLogOut])
async def get_audit_logs() -> list[AuditLogOut]:
    return await audit_log_service.list_all_logs()


@router.get("/{log_id}", response_model=AuditLogDetailOut)
async def get_audit_log_detail(log_id: str) -> AuditLogDetailOut:
    return await audit_log_service.get_log_detail(log_id)
