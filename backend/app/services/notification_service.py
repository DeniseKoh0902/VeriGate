from fastapi import HTTPException, status

from app.db.pool import get_pool
from app.repositories import notification_repository
from app.schemas.notification import NotificationOut, UnreadCountOut


async def list_notifications(user_id: str) -> list[NotificationOut]:
    pool = get_pool()
    rows = await notification_repository.list_notifications_for_user(pool, user_id)
    return [NotificationOut(**dict(row)) for row in rows]


async def get_unread_count(user_id: str) -> UnreadCountOut:
    pool = get_pool()
    count = await notification_repository.count_unread(pool, user_id)
    return UnreadCountOut(count=count)


async def mark_notification_read(notification_id: str, user_id: str) -> NotificationOut:
    pool = get_pool()
    row = await notification_repository.mark_read(pool, notification_id, user_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    return NotificationOut(**dict(row))


async def mark_all_notifications_read(user_id: str) -> None:
    pool = get_pool()
    await notification_repository.mark_all_read(pool, user_id)
