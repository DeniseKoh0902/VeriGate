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


class AttachmentOut(BaseModel):
    id: str
    fileName: str
    mimeType: str
    fileSize: int
    # True when this attachment's extracted content matched a Sensitive Data
    # Rule / Use Case Policy — its bytes are kept for audit purposes but were
    # never forwarded to the AI model (pixel-level redaction isn't feasible).
    isRedacted: bool


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
    attachments: list[AttachmentOut] = []


class PromptHistoryItem(BaseModel):
    promptId: str
    promptText: str
    status: str
    sanitizedText: str | None
    riskFindings: list[RiskFindingOut]
    responseText: str | None
    createdAt: UtcDatetime
    attachments: list[AttachmentOut] = []


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
    # APPROVED = fully trusted. RESTRICTED = Pending Review, selectable only
    # because an admin opted at least one category in via a Tool Tier
    # Policy — individual prompts can still get BLOCKed depending on content.
    riskTier: str
