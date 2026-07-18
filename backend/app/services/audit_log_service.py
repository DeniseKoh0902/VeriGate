import json

from fastapi import HTTPException, status

from app.db.pool import get_pool
from app.repositories import (
    ai_tool_repository,
    ai_tool_request_repository,
    appeal_repository,
    audit_log_repository,
    policy_recommendation_repository,
    policy_repository,
    prompt_repository,
    risk_alert_repository,
    sensitive_data_rule_repository,
    user_repository,
)
from app.schemas.audit_log import AuditLogDetailOut, AuditLogOut
from app.schemas.prompt import RiskFindingOut


async def list_all_logs() -> list[AuditLogOut]:
    pool = get_pool()
    rows = await audit_log_repository.list_all_logs(pool)
    return [AuditLogOut(**dict(row)) for row in rows]


async def _resolve_appeal_prompt_id(pool, appeal) -> str | None:
    """Mirrors appeal_service._resolve_prompt_id: a RISK_ALERT (or legacy
    PROMPT_BLOCK) appeal traces back to a Prompt row — RISK_ALERT indirectly
    via the alert's promptId."""
    if appeal["sourceType"] == "PROMPT_BLOCK":
        return appeal["sourceId"]
    if appeal["sourceType"] == "RISK_ALERT":
        alert = await risk_alert_repository.get_alert_by_id(pool, appeal["sourceId"])
        return alert["promptId"] if alert else None
    return None


async def _add_prompt_detail(pool, fields: dict, prompt_id: str) -> None:
    prompt = await prompt_repository.get_prompt_by_id(pool, prompt_id)
    if prompt is None:
        return
    response = await prompt_repository.get_ai_response_by_prompt_id(pool, prompt_id)
    fields["promptText"] = prompt["promptText"]
    fields["sanitizedText"] = prompt["sanitizedText"]
    fields["responseText"] = response["responseText"] if response else None
    fields["riskFindings"] = [
        RiskFindingOut(category=f["category"], riskLevel=f["riskLevel"], note=f["note"])
        for f in prompt["riskFindings"]
    ]


async def get_log_detail(log_id: str) -> AuditLogDetailOut:
    pool = get_pool()
    row = await audit_log_repository.get_log_by_id(pool, log_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audit log entry not found.")

    # A Removed action carries its own snapshot of the entity's detail
    # fields, captured at deletion time — the row itself is gone by now, so
    # there's nothing left to look up live. Every other action still
    # resolves its detail live, below.
    if row["snapshot"]:
        return AuditLogDetailOut(**dict(row), **json.loads(row["snapshot"]))

    fields: dict = {}
    entity_type = row["entityType"]
    entity_id = row["entityId"]

    if entity_type == "Prompt":
        await _add_prompt_detail(pool, fields, entity_id)

    elif entity_type == "Appeal":
        appeal = await appeal_repository.get_appeal_by_id(pool, entity_id)
        if appeal is not None:
            fields["justification"] = appeal["justification"]
            fields["resolutionNotes"] = appeal["resolutionNotes"]
            if appeal["sourceType"] == "TOOL_REJECTION":
                request = await ai_tool_request_repository.get_request_by_id(pool, appeal["sourceId"])
                if request is not None:
                    fields["toolName"] = request["toolName"]
                    fields["businessReason"] = request["businessReason"]
            else:
                prompt_id = await _resolve_appeal_prompt_id(pool, appeal)
                if prompt_id is not None:
                    await _add_prompt_detail(pool, fields, prompt_id)

    elif entity_type == "RiskAlert":
        alert = await risk_alert_repository.get_alert_by_id(pool, entity_id)
        if alert is not None:
            fields["alertType"] = alert["alertType"]
            fields["severity"] = alert["severity"]
            fields["description"] = alert["description"]
            if alert["promptId"]:
                await _add_prompt_detail(pool, fields, alert["promptId"])

    elif entity_type == "AiTool":
        tool = await ai_tool_repository.get_ai_tool(pool, entity_id)
        if tool is not None:
            fields["vendor"] = tool["vendor"]
            fields["version"] = tool["version"]
            fields["riskTier"] = tool["riskTier"]
            fields["description"] = tool["description"]

    elif entity_type == "Policy":
        policy = await policy_repository.get_policy_by_id(pool, entity_id)
        if policy is not None:
            fields["policyName"] = policy["name"]
            fields["description"] = policy["description"]
            fields["severity"] = policy["severity"]
            fields["appliesToDepartment"] = policy["appliesToDepartment"]

    elif entity_type == "SensitiveDataRule":
        rule = await sensitive_data_rule_repository.get_rule_by_id(pool, entity_id)
        if rule is not None:
            fields["category"] = rule["category"]
            fields["riskLevel"] = rule["riskLevel"]
            fields["ruleAction"] = rule["action"]

    elif entity_type == "User":
        target = await user_repository.get_user_by_id(pool, entity_id)
        if target is not None:
            fields["targetRole"] = target["role"]
            fields["targetDepartment"] = target["department"]
            fields["targetIsActive"] = target["isActive"]

    elif entity_type == "AiToolRequest":
        request = await ai_tool_request_repository.get_request_by_id(pool, entity_id)
        if request is not None:
            fields["toolName"] = request["toolName"]
            fields["businessReason"] = request["businessReason"]

    elif entity_type == "PolicyRecommendation":
        recommendation = await policy_recommendation_repository.get_by_id(pool, entity_id)
        if recommendation is not None:
            fields["recommendationTitle"] = recommendation["title"]
            fields["recommendationRationale"] = recommendation["rationale"]
            fields["recommendationDepartment"] = recommendation["department"]
            fields["recommendationStatus"] = recommendation["status"]
            fields["recommendationConfidenceScore"] = recommendation["confidenceScore"]

    return AuditLogDetailOut(**dict(row), **fields)
