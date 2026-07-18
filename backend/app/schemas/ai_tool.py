from typing import Literal

from pydantic import BaseModel

from app.schemas.common import UtcDatetime

AiToolRiskTier = Literal["APPROVED", "RESTRICTED", "BLOCKED"]


class AiToolCreate(BaseModel):
    name: str
    vendor: str
    version: str | None = None
    endpoint: str | None = None
    description: str | None = None
    riskTier: AiToolRiskTier = "RESTRICTED"


class AiToolUpdate(BaseModel):
    vendor: str | None = None
    version: str | None = None
    endpoint: str | None = None
    description: str | None = None
    riskTier: AiToolRiskTier | None = None


class AiToolOut(BaseModel):
    id: str
    name: str
    vendor: str
    version: str | None
    endpoint: str | None
    description: str | None
    riskTier: AiToolRiskTier
    isApproved: bool
    approvedById: str | None
    approvedAt: UtcDatetime | None
    createdAt: UtcDatetime
    updatedAt: UtcDatetime
    overallScore: int | None


class AiTrustEvaluationCreate(BaseModel):
    securityScore: int
    privacyScore: int
    complianceScore: int
    availabilityScore: int
    explainabilityScore: int
    orgPolicyScore: int


class AiTrustEvaluationProposal(BaseModel):
    securityScore: int
    privacyScore: int
    complianceScore: int
    availabilityScore: int
    explainabilityScore: int
    orgPolicyScore: int
    overallScore: int
    justification: str


class AiTrustEvaluationOut(BaseModel):
    id: str
    aiToolId: str
    securityScore: int
    privacyScore: int
    complianceScore: int
    availabilityScore: int
    explainabilityScore: int
    orgPolicyScore: int
    overallScore: int
    evaluatedById: str
    evaluatedAt: UtcDatetime
