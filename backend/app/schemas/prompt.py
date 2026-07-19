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


class IntentClassificationOut(BaseModel):
    """Raw intent-classifier output for this prompt — surfaced regardless of
    whether it matched a UseCasePolicy, so admins/devs can see what Gemini
    actually returned (e.g. to debug why a prompt was or wasn't flagged)
    without needing backend console access."""

    category: str
    confidence: int
    matchedUseCase: str | None


class PromptSubmitResponse(BaseModel):
    promptId: str
    sessionId: str
    status: str
    sanitizedText: str | None
    riskFindings: list[RiskFindingOut]
    sanitizationChanges: list[SanitizationChangeOut]
    responseText: str | None
    intentClassification: IntentClassificationOut | None = None


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
