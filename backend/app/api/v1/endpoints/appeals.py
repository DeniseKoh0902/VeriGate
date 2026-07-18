from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_current_user, require_roles
from app.schemas.appeal import AppealAdminOut, AppealCreate, AppealOut, AppealResolveRequest
from app.schemas.user import UserOut
from app.services import appeal_service

router = APIRouter(prefix="/appeals", tags=["appeals"])

_require_governance = require_roles("ADMIN", "COMPLIANCE")


# Static "/mine" is registered ahead of any future "/{appeal_id}" routes so a
# dynamic id segment can never shadow it.
@router.get("/mine", response_model=list[AppealOut])
async def get_my_appeals(current_user: UserOut = Depends(get_current_user)) -> list[AppealOut]:
    return await appeal_service.list_my_appeals(current_user.id)


@router.get("", response_model=list[AppealAdminOut])
async def get_all_appeals(
    current_user: UserOut = Depends(_require_governance),
) -> list[AppealAdminOut]:
    return await appeal_service.list_all_appeals()


@router.post("", response_model=AppealOut, status_code=status.HTTP_201_CREATED)
async def create_appeal(
    payload: AppealCreate, current_user: UserOut = Depends(get_current_user)
) -> AppealOut:
    return await appeal_service.create_appeal(payload, current_user.id)


@router.patch("/{appeal_id}/resolve", response_model=AppealAdminOut)
async def resolve_appeal(
    appeal_id: str,
    payload: AppealResolveRequest,
    current_user: UserOut = Depends(_require_governance),
) -> AppealAdminOut:
    return await appeal_service.resolve_appeal(appeal_id, payload, current_user.id)
