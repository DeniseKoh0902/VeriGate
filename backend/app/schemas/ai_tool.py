from typing import Literal

from pydantic import BaseModel

from app.schemas.common import UtcDatetime

AiToolRiskTier = Literal["APPROVED", "RESTRICTED", "BLOCKED"]
TrustEvaluationDecision = Literal["APPROVED", "REJECTED"]


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
    decisionNotes: str | None = None
    providerId: str | None = None


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
    decisionNotes: str | None
    createdAt: UtcDatetime
    updatedAt: UtcDatetime
    overallScore: int | None
    earliestSlaDeadline: UtcDatetime | None
    providerId: str | None
    providerVendor: str | None
    providerHasApiKey: bool


class AiTrustEvaluationCreate(BaseModel):
    securityScore: int
    securityReason: str
    privacyScore: int
    privacyReason: str
    complianceScore: int
    complianceReason: str
    availabilityScore: int
    availabilityReason: str
    explainabilityScore: int
    explainabilityReason: str
    orgPolicyScore: int
    orgPolicyReason: str
    justification: str
    decision: TrustEvaluationDecision = "APPROVED"
    # Required when decision is REJECTED — surfaced to the tool's requester(s)
    # and reused to auto-resolve any future duplicate request for this tool.
    rejectionReason: str | None = None


class AiTrustEvaluationUpdate(BaseModel):
    """Edits the tool's existing latest evaluation in place — scores, reasons,
    and justification only. No decision, no new evaluation record, no
    notification to anyone; that's what Approve/Reject are for."""

    securityScore: int
    securityReason: str
    privacyScore: int
    privacyReason: str
    complianceScore: int
    complianceReason: str
    availabilityScore: int
    availabilityReason: str
    explainabilityScore: int
    explainabilityReason: str
    orgPolicyScore: int
    orgPolicyReason: str
    justification: str


class AiTrustEvaluationProposal(BaseModel):
    securityScore: int
    securityReason: str
    privacyScore: int
    privacyReason: str
    complianceScore: int
    complianceReason: str
    availabilityScore: int
    availabilityReason: str
    explainabilityScore: int
    explainabilityReason: str
    orgPolicyScore: int
    orgPolicyReason: str
    overallScore: int
    justification: str


class AiTrustEvaluationOut(BaseModel):
    id: str
    aiToolId: str
    securityScore: int
    securityReason: str | None
    privacyScore: int
    privacyReason: str | None
    complianceScore: int
    complianceReason: str | None
    availabilityScore: int
    availabilityReason: str | None
    explainabilityScore: int
    explainabilityReason: str | None
    orgPolicyScore: int
    orgPolicyReason: str | None
    overallScore: int
    justification: str | None
    evaluatedById: str
    evaluatedAt: UtcDatetime
