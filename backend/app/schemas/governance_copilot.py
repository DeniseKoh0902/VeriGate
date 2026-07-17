from typing import Literal

from pydantic import BaseModel, Field

ChatRole = Literal["user", "copilot"]


class ChatMessage(BaseModel):
    role: ChatRole
    text: str


class GovernanceCopilotRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)


class GovernanceCopilotResponse(BaseModel):
    message: ChatMessage