import asyncpg

from app.db.pool import get_pool
from app.repositories import (
    ai_tool_request_repository,
    appeal_repository,
    prompt_repository,
    risk_alert_repository,
)
from app.schemas.compliance import ComplianceOverviewOut, ComplianceRecordOut, FlagStatus
from app.schemas.prompt import RiskFindingOut
from app.services import incident_service

_GOOD_STANDING_FLAG_THRESHOLD = 2


def _flag_status_for_appeal(appeal: asyncpg.Record | None) -> FlagStatus:
    if appeal is None:
        return "OPEN"
    if appeal["status"] == "PENDING":
        return "APPEAL_PENDING"
    if appeal["status"] == "UNDER_REVIEW":
        return "APPEAL_UNDER_REVIEW"
    return "OVERTURNED" if appeal["resolution"] == "OVERTURNED" else "UPHELD"


async def get_overview(user_id: str) -> ComplianceOverviewOut:
    pool = get_pool()

    prompts = await prompt_repository.list_prompts_for_user(pool, user_id)
    tool_requests = await ai_tool_request_repository.list_requests_by_user(pool, user_id)
    risk_alerts = await risk_alert_repository.list_alerts_for_user(pool, user_id)
    appeals = await appeal_repository.list_appeals_by_user(pool, user_id)

    appeals_by_source = {(a["sourceType"], a["sourceId"]): a for a in appeals}

    records: list[ComplianceRecordOut] = []

    for prompt in prompts:
        if prompt["status"] != "BLOCKED":
            continue
        appeal = appeals_by_source.get(("PROMPT_BLOCK", prompt["id"]))
        risk_findings = prompt["riskFindings"]
        description = incident_service.describe_prompt_block(prompt)
        records.append(
            ComplianceRecordOut(
                id=prompt["id"],
                sourceType="PROMPT_BLOCK",
                title=description["title"],
                policy=description["policy"],
                date=prompt["createdAt"],
                flagStatus=_flag_status_for_appeal(appeal),
                appealable=appeal is None,
                appealId=appeal["id"] if appeal else None,
                appealStatus=appeal["status"] if appeal else None,
                appealResolution=appeal["resolution"] if appeal else None,
                promptText=prompt["promptText"],
                sanitizedText=prompt["sanitizedText"],
                riskFindings=[
                    RiskFindingOut(category=f["category"], riskLevel=f["riskLevel"], note=f["note"])
                    for f in risk_findings
                ],
            )
        )

    for req in tool_requests:
        if req["status"] != "REJECTED":
            continue
        appeal = appeals_by_source.get(("TOOL_REJECTION", req["id"]))
        description = incident_service.describe_tool_rejection(req)
        records.append(
            ComplianceRecordOut(
                id=req["id"],
                sourceType="TOOL_REJECTION",
                title=description["title"],
                policy=description["policy"],
                date=req["submittedAt"],
                flagStatus=_flag_status_for_appeal(appeal),
                appealable=appeal is None,
                appealId=appeal["id"] if appeal else None,
                appealStatus=appeal["status"] if appeal else None,
                appealResolution=appeal["resolution"] if appeal else None,
                toolName=req["toolName"],
                businessReason=req["businessReason"],
                department=req["department"],
                rejectionReason=req["rejectionReason"],
            )
        )

    for alert in risk_alerts:
        appeal = appeals_by_source.get(("RISK_ALERT", alert["id"]))
        description = incident_service.describe_risk_alert(alert)
        records.append(
            ComplianceRecordOut(
                id=alert["id"],
                sourceType="RISK_ALERT",
                title=description["title"],
                policy=description["policy"],
                date=alert["createdAt"],
                flagStatus=_flag_status_for_appeal(appeal),
                appealable=appeal is None,
                appealId=appeal["id"] if appeal else None,
                appealStatus=appeal["status"] if appeal else None,
                appealResolution=appeal["resolution"] if appeal else None,
                alertType=alert["alertType"],
                severity=alert["severity"],
                description=alert["description"],
            )
        )

    records.sort(key=lambda r: r.date, reverse=True)

    total_flags = len(records)
    resolved_appeals = sum(1 for a in appeals if a["status"] == "RESOLVED")
    has_active_appeal = any(a["status"] in ("PENDING", "UNDER_REVIEW") for a in appeals)

    if has_active_appeal:
        standing = "UNDER_REVIEW"
    elif total_flags <= _GOOD_STANDING_FLAG_THRESHOLD:
        standing = "GOOD_STANDING"
    else:
        standing = "NEEDS_ATTENTION"

    return ComplianceOverviewOut(
        totalFlags=total_flags,
        resolvedAppeals=resolved_appeals,
        standing=standing,
        records=records,
    )
