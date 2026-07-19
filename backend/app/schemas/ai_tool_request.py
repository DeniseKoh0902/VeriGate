from typing import Literal

from pydantic import BaseModel

from app.schemas.common import UtcDatetime

RequestStatus = Literal["PENDING", "APPROVED", "REJECTED"]


class AiToolRequestCreate(BaseModel):
    toolName: str
    businessReason: str


class AiToolRequestOut(BaseModel):
    id: str
    userId: str
    toolName: str
    businessReason: str
    department: str
    status: RequestStatus
    rejectionReason: str | None
    approvedToolId: str | None
    reviewedById: str | None
    submittedAt: UtcDatetime
    reviewedAt: UtcDatetime | None
