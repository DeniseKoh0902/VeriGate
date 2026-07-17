from datetime import datetime
from typing import Literal

from pydantic import BaseModel

RiskLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
RuleAction = Literal["ALLOW", "WARN", "BLOCK", "SANITIZE"]


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
    createdAt: datetime


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
    createdAt: datetime
