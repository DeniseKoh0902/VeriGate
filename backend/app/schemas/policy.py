from typing import Literal

from pydantic import BaseModel

from app.schemas.common import UtcDatetime

RiskLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
RuleAction = Literal["ALLOW", "WARN", "BLOCK", "SANITIZE", "REQUIRE_APPROVAL"]
# BLOCKED tools are already a hard stop in prompt_service before any policy
# lookup runs, so a tier policy for BLOCKED would never fire — only these two
# tiers are meaningful to configure.
ToolTier = Literal["APPROVED", "RESTRICTED"]


class PolicyCreate(BaseModel):
    name: str
    description: str | None = None
    severity: str
    appliesToDepartment: str | None = None


class PolicyUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    severity: str | None = None
    appliesToDepartment: str | None = None
    isActive: bool | None = None


class PolicyOut(BaseModel):
    id: str
    name: str
    description: str | None
    severity: str
    appliesToDepartment: str | None
    isActive: bool
    createdById: str
    createdAt: UtcDatetime


class SensitiveDataRuleCreate(BaseModel):
    category: str
    riskLevel: RiskLevel
    action: RuleAction


class SensitiveDataRuleUpdate(BaseModel):
    category: str | None = None
    riskLevel: RiskLevel | None = None
    action: RuleAction | None = None
    isActive: bool | None = None


class SensitiveDataRuleOut(BaseModel):
    id: str
    category: str
    riskLevel: RiskLevel
    action: RuleAction
    isActive: bool
    createdById: str
    createdAt: UtcDatetime


class UseCasePolicyCreate(BaseModel):
    useCase: str
    description: str | None = None
    riskLevel: RiskLevel
    action: RuleAction
    minConfidence: int = 70


class UseCasePolicyUpdate(BaseModel):
    useCase: str | None = None
    description: str | None = None
    riskLevel: RiskLevel | None = None
    action: RuleAction | None = None
    minConfidence: int | None = None
    isActive: bool | None = None


class UseCasePolicyOut(BaseModel):
    id: str
    useCase: str
    description: str | None
    riskLevel: RiskLevel
    action: RuleAction
    minConfidence: int
    isActive: bool
    createdById: str
    createdAt: UtcDatetime


class ToolTierPolicyCreate(BaseModel):
    toolTier: ToolTier
    # None = applies to every tool in toolTier (a class-level rule). Set =
    # applies to this one tool only, overriding the class-level rule for it.
    aiToolId: str | None = None
    category: str
    riskLevel: RiskLevel
    action: RuleAction


class ToolTierPolicyUpdate(BaseModel):
    toolTier: ToolTier | None = None
    aiToolId: str | None = None
    category: str | None = None
    riskLevel: RiskLevel | None = None
    action: RuleAction | None = None
    isActive: bool | None = None


class ToolTierPolicyOut(BaseModel):
    id: str
    toolTier: ToolTier
    aiToolId: str | None
    aiToolName: str | None = None
    category: str
    riskLevel: RiskLevel
    action: RuleAction
    isActive: bool
    createdById: str
    createdAt: UtcDatetime
