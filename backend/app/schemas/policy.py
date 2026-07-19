from typing import Literal

from pydantic import BaseModel

from app.schemas.common import UtcDatetime

RiskLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
RuleAction = Literal["ALLOW", "WARN", "BLOCK", "SANITIZE", "REQUIRE_APPROVAL"]


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
