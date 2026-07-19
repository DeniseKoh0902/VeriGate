from pydantic import BaseModel

from app.schemas.common import UtcDatetime


class NotificationOut(BaseModel):
    id: str
    title: str
    message: str
    type: str
    relatedEntityType: str | None
    relatedEntityId: str | None
    isRead: bool
    createdAt: UtcDatetime


class UnreadCountOut(BaseModel):
    count: int
