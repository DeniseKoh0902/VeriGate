from typing import TypedDict


class SourceDescription(TypedDict):
    title: str
    policy: str | None


def describe_prompt_block(prompt: dict) -> SourceDescription:
    risk_findings = prompt.get("riskFindings") or []
    category = risk_findings[0]["category"] if risk_findings else None
    return {
        "title": f"Prompt blocked — {category} detected"
        if category
        else "Prompt blocked by governance policy",
        "policy": category,
    }


def describe_tool_rejection(request: dict) -> SourceDescription:
    return {
        "title": f'{request["toolName"]} request rejected',
        "policy": request["rejectionReason"],
    }


def describe_risk_alert(alert: dict) -> SourceDescription:
    return {
        "title": alert["description"] or alert["alertType"],
        "policy": alert["alertType"],
    }
