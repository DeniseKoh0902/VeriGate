from typing import Literal

from pydantic import BaseModel

from app.schemas.common import UtcDatetime

ChatRole = Literal["user", "copilot"]


class ChatMessage(BaseModel):
    role: ChatRole
    text: str


class ChatMessageOut(ChatMessage):
    createdAt: UtcDatetime


class GovernanceCopilotRequest(BaseModel):
    message: str
    # Omit to start a new conversation; the new session's id comes back on
    # the response so the client can keep sending follow-ups into it.
    sessionId: str | None = None


class GovernanceCopilotResponse(BaseModel):
    message: ChatMessage
    sessionId: str


class GovernanceCopilotSessionOut(BaseModel):
    id: str
    preview: str
    lastMessageAt: UtcDatetime
    createdAt: UtcDatetime