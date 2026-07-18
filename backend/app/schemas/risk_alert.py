from typing import Literal

from pydantic import BaseModel

from app.schemas.appeal import AppealResolution, AppealStatus
from app.schemas.common import UtcDatetime
from app.schemas.prompt import RiskFindingOut

RiskAlertStatus = Literal["OPEN", "RESOLVED", "ESCALATED"]


class RiskAlertAdminOut(BaseModel):
    id: str
    alertType: str
    severity: str
    description: str | None
    status: RiskAlertStatus
    createdAt: UtcDatetime
    employeeName: str
    employeeEmail: str
    aiToolName: str | None
    promptText: str | None
    riskFindings: list[RiskFindingOut] = []

    # Set when the employee has appealed this alert (or, for legacy data, the
    # prompt block it was merged from) — surfaced so admins reviewing the
    # alert can see a dispute is in play, without this alert's own OPEN /
    # RESOLVED / ESCALATED status controlling or being controlled by the
    # appeal's outcome.
    appealStatus: AppealStatus | None = None
    appealResolution: AppealResolution | None = None
