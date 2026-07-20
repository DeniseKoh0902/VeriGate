from pydantic import BaseModel

from app.schemas.ai_tool import AiToolRiskTier
from app.schemas.common import UtcDatetime
from app.schemas.risk_alert import RiskAlertStatus


class StatTileOut(BaseModel):
    label: str
    value: str
    unit: str
    trend: list[float]


class DashboardAlertOut(BaseModel):
    id: str
    createdAt: UtcDatetime
    alertType: str
    aiToolName: str | None
    severity: str
    status: RiskAlertStatus


class RiskDistributionSegmentOut(BaseModel):
    label: str
    value: int


class ComplianceScoreOut(BaseModel):
    todayPct: float
    deltaVsYesterday: float


class TrustScoreSummaryOut(BaseModel):
    toolName: str
    riskTier: AiToolRiskTier
    overallScore: int
    securityScore: int
    complianceScore: int


class AiToolStatusOut(BaseModel):
    toolName: str
    vendor: str
    isApproved: bool
    riskTier: AiToolRiskTier


class DepartmentUsageOut(BaseModel):
    department: str
    promptCount: int
    blockedCount: int
    blockRatePct: float
    activeUsers: int
    topTool: str | None


class DashboardOverviewOut(BaseModel):
    statTiles: list[StatTileOut]
    recentAlerts: list[DashboardAlertOut]
    riskDistribution: list[RiskDistributionSegmentOut]
    complianceScore: ComplianceScoreOut
    trustScores: list[TrustScoreSummaryOut]
    recentAiTools: list[AiToolStatusOut]
    usageByDepartment: list[DepartmentUsageOut]
