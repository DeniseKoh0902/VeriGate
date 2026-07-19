from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import UtcDatetime

RequestStatus = Literal["PENDING", "APPROVED", "REJECTED"]

# Fixed vocabulary rather than free text — lets intake actually drive triage
# and feed the AI evaluation as real declared context, and overlaps with
# SensitiveDataRule's own categories so the two systems talk about the same
# things.
DataCategory = Literal[
    "PII",
    "Financial / Payment Data",
    "Health / Medical Data",
    "Credentials / API Keys",
    "Source Code / Intellectual Property",
    "Customer / Client Data",
    "Internal Confidential Documents",
    "None — Public / Non-sensitive Only",
]


class AiToolRequestCreate(BaseModel):
    toolName: str
    businessReason: str
    dataCategories: list[DataCategory] = Field(min_length=1)


class AiToolRequestOut(BaseModel):
    id: str
    userId: str
    toolName: str
    businessReason: str
    department: str
    dataCategories: list[str]
    status: RequestStatus
    rejectionReason: str | None
    approvedToolId: str | None
    reviewedById: str | None
    submittedAt: UtcDatetime
    reviewedAt: UtcDatetime | None
    slaDeadline: UtcDatetime | None
