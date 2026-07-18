from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.appeal import AppealResolution, AppealSourceType, AppealStatus
from app.schemas.prompt import RiskFindingOut

FlagStatus = Literal["OPEN", "APPEAL_PENDING", "APPEAL_UNDER_REVIEW", "UPHELD", "OVERTURNED"]
Standing = Literal["GOOD_STANDING", "NEEDS_ATTENTION", "UNDER_REVIEW"]


class ComplianceRecordOut(BaseModel):
    id: str
    sourceType: AppealSourceType
    title: str
    policy: str | None
    date: datetime
    flagStatus: FlagStatus
    appealable: bool
    appealId: str | None
    appealStatus: AppealStatus | None
    appealResolution: AppealResolution | None

    # Prompt Block detail
    promptText: str | None = None
    sanitizedText: str | None = None
    riskFindings: list[RiskFindingOut] = []

    # Tool Rejection detail
    toolName: str | None = None
    businessReason: str | None = None
    department: str | None = None
    rejectionReason: str | None = None

    # Risk Alert detail
    alertType: str | None = None
    severity: str | None = None
    description: str | None = None


class ComplianceOverviewOut(BaseModel):
    totalFlags: int
    resolvedAppeals: int
    standing: Standing
    records: list[ComplianceRecordOut]
