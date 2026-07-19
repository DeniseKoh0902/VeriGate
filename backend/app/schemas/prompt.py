from pydantic import BaseModel

from app.schemas.common import UtcDatetime


class PromptSubmitRequest(BaseModel):
    aiToolName: str
    promptText: str
    sessionId: str | None = None


class RiskFindingOut(BaseModel):
    category: str
    riskLevel: str
    note: str | None


class SanitizationChangeOut(BaseModel):
    original: str
    replacement: str


class PromptSubmitResponse(BaseModel):
    promptId: str
    sessionId: str
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
    createdAt: UtcDatetime


class ChatSessionOut(BaseModel):
    id: str
    aiToolName: str
    preview: str
    lastMessageAt: UtcDatetime
    createdAt: UtcDatetime


class AvailableModelOut(BaseModel):
    name: str
    trustScore: int | None
    recommended: bool
