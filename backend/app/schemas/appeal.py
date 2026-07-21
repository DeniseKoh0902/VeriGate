from typing import Literal

from pydantic import BaseModel

from app.schemas.common import UtcDatetime
from app.schemas.prompt import AttachmentOut, RiskFindingOut

AppealSourceType = Literal["PROMPT_BLOCK", "TOOL_REJECTION", "RISK_ALERT"]
AppealStatus = Literal["PENDING", "UNDER_REVIEW", "AWAITING_INFO", "RESOLVED"]
AppealResolution = Literal["UPHELD", "OVERTURNED"]


class AppealCreate(BaseModel):
    sourceType: AppealSourceType
    sourceId: str
    justification: str
    evidenceUrl: str | None = None


class AppealOut(BaseModel):
    id: str
    sourceType: AppealSourceType
    sourceId: str
    userId: str
    justification: str
    evidenceUrl: str | None
    status: AppealStatus
    resolution: AppealResolution | None
    resolutionNotes: str | None
    additionalInfoRequest: str | None
    employeeResponse: str | None
    reviewedById: str | None
    slaDeadline: UtcDatetime | None
    createdAt: UtcDatetime
    resolvedAt: UtcDatetime | None


class AppealResolveRequest(BaseModel):
    resolution: AppealResolution
    resolutionNotes: str | None = None


class AppealRequestInfoRequest(BaseModel):
    message: str


class AppealRespondRequest(BaseModel):
    response: str


class AppealAdminOut(BaseModel):
    id: str
    sourceType: AppealSourceType
    sourceId: str
    title: str
    policy: str | None
    employeeName: str
    employeeEmail: str
    justification: str
    evidenceUrl: str | None
    status: AppealStatus
    resolution: AppealResolution | None
    resolutionNotes: str | None
    additionalInfoRequest: str | None
    employeeResponse: str | None
    slaDeadline: UtcDatetime | None
    createdAt: UtcDatetime
    resolvedAt: UtcDatetime | None

    # Populated for RISK_ALERT (and legacy PROMPT_BLOCK) appeals so the
    # reviewer can see exactly what was sent, not just the rule it tripped.
    promptText: str | None = None
    riskFindings: list[RiskFindingOut] = []
    attachments: list[AttachmentOut] = []
