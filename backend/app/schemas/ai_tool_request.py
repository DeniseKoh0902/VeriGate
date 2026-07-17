from datetime import datetime
from typing import Literal

from pydantic import BaseModel

RequestStatus = Literal["PENDING", "APPROVED", "REJECTED"]


class AiToolRequestCreate(BaseModel):
    toolName: str
    businessReason: str
    department: str


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
    submittedAt: datetime
    reviewedAt: datetime | None
