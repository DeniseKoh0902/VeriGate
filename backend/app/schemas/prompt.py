from datetime import datetime

from pydantic import BaseModel


class PromptSubmitRequest(BaseModel):
    aiToolName: str
    promptText: str


class RiskFindingOut(BaseModel):
    category: str
    riskLevel: str
    note: str | None


class SanitizationChangeOut(BaseModel):
    original: str
    replacement: str


class PromptSubmitResponse(BaseModel):
    promptId: str
    status: str
    sanitizedText: str | None
    riskFindings: list[RiskFindingOut]
    sanitizationChanges: list[SanitizationChangeOut]
    responseText: str | None


class PromptHistoryItem(BaseModel):
    promptId: str
    promptText: str
    status: str
    sanitizedText: str | None
    riskFindings: list[RiskFindingOut]
    responseText: str | None
    createdAt: datetime
