from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_current_user
from app.schemas.notification import NotificationOut, UnreadCountOut
from app.schemas.user import UserOut
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


# Static paths are registered before the dynamic "/{notification_id}/read"
# path below, so a notification id can never shadow them.
@router.get("/unread-count", response_model=UnreadCountOut)
async def get_unread_count(current_user: UserOut = Depends(get_current_user)) -> UnreadCountOut:
    return await notification_service.get_unread_count(current_user.id)


@router.patch("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(current_user: UserOut = Depends(get_current_user)) -> None:
    await notification_service.mark_all_notifications_read(current_user.id)


@router.get("", response_model=list[NotificationOut])
async def get_notifications(
    current_user: UserOut = Depends(get_current_user),
) -> list[NotificationOut]:
    return await notification_service.list_notifications(current_user.id)


@router.patch("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(
    notification_id: str, current_user: UserOut = Depends(get_current_user)
) -> NotificationOut:
    return await notification_service.mark_notification_read(notification_id, current_user.id)
