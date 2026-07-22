from pydantic import BaseModel, Field

from app.schemas.common import UtcDatetime


class AiProviderConfigure(BaseModel):
    """One call for both "create a new provider" and "rotate an existing
    one's key" — keyed by vendor, since the admin-facing flow (inline in the
    tool approval panel, or the standalone Providers page) never needs to
    know a provider's id up front, only which vendor it's configuring."""

    vendor: str
    apiKey: str = Field(min_length=1)
    apiBaseUrl: str | None = None


class AiProviderOut(BaseModel):
    id: str
    vendor: str
    apiBaseUrl: str | None
    hasApiKey: bool
    keyLastFour: str | None
    configuredById: str | None
    configuredAt: UtcDatetime | None
    createdAt: UtcDatetime
    toolCount: int
