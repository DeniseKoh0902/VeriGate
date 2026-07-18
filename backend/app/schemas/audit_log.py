from datetime import datetime

from pydantic import BaseModel

from app.schemas.prompt import RiskFindingOut


class AuditLogOut(BaseModel):
    id: str
    action: str
    entityType: str
    entityId: str
    createdAt: datetime

    # Null when the log has no attached user (e.g. a failed login against an
    # email with no matching account).
    employeeName: str | None
    employeeEmail: str | None
    department: str | None

    # Only resolved when entityType is "Prompt" — the AI tool the prompt
    # was submitted through.
    aiToolName: str | None


class AuditLogDetailOut(AuditLogOut):
    """Entity-specific fields resolved for the "View Details" panel — which
    ones are populated depends entirely on entityType. Fields are shared
    across entity types where the meaning genuinely overlaps (e.g. severity
    and description apply to both RiskAlert and Policy)."""

    # Prompt (and Appeal/RiskAlert logs that trace back to one)
    promptText: str | None = None
    sanitizedText: str | None = None
    responseText: str | None = None
    riskFindings: list[RiskFindingOut] = []

    # Appeal
    justification: str | None = None
    resolutionNotes: str | None = None

    # RiskAlert / Policy
    alertType: str | None = None
    severity: str | None = None
    description: str | None = None

    # AiTool
    vendor: str | None = None
    version: str | None = None
    riskTier: str | None = None

    # Policy
    policyName: str | None = None
    appliesToDepartment: str | None = None

    # SensitiveDataRule
    category: str | None = None
    riskLevel: str | None = None
    ruleAction: str | None = None

    # User (employee management target — distinct from employeeName/
    # department above, which describe who performed the logged action)
    targetRole: str | None = None
    targetDepartment: str | None = None
    targetIsActive: bool | None = None

    # AiToolRequest (and Appeal logs on a TOOL_REJECTION source)
    toolName: str | None = None
    businessReason: str | None = None
