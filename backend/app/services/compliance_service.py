import asyncpg

from app.db.pool import get_pool
from app.repositories import (
    ai_tool_request_repository,
    appeal_repository,
    prompt_repository,
    risk_alert_repository,
)
from app.repositories.user_repository import get_or_create_demo_employee
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
    if appeal["status"] == "AWAITING_INFO":
        return "APPEAL_AWAITING_INFO"
    return "OVERTURNED" if appeal["resolution"] == "OVERTURNED" else "UPHELD"


async def get_overview() -> ComplianceOverviewOut:
    pool = get_pool()
    # TODO: replace with the authenticated employee's user id once real login is wired up.
    user_id = await get_or_create_demo_employee(pool)

    prompts_by_id = {
        p["id"]: p for p in await prompt_repository.list_prompts_for_user(pool, user_id)
    }
    tool_requests = await ai_tool_request_repository.list_requests_by_user(pool, user_id)
    risk_alerts = await risk_alert_repository.list_alerts_for_user(pool, user_id)
    appeals = await appeal_repository.list_appeals_by_user(pool, user_id)

    appeals_by_source = {(a["sourceType"], a["sourceId"]): a for a in appeals}

    records: list[ComplianceRecordOut] = []

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
                additionalInfoRequest=appeal["additionalInfoRequest"] if appeal else None,
                employeeResponse=appeal["employeeResponse"] if appeal else None,
                toolName=req["toolName"],
                businessReason=req["businessReason"],
                department=req["department"],
                rejectionReason=req["rejectionReason"],
            )
        )

    for alert in risk_alerts:
        # A risk alert raised from a blocked prompt used to also surface as a
        # separate "Prompt Block" record for the same incident. They're now
        # merged into a single Risk Alert record; fall back to an appeal
        # filed under the old PROMPT_BLOCK source so it still shows as
        # already-appealed instead of appealable again.
        prompt = prompts_by_id.get(alert["promptId"])
        appeal = appeals_by_source.get(("RISK_ALERT", alert["id"]))
        if appeal is None and prompt is not None:
            appeal = appeals_by_source.get(("PROMPT_BLOCK", prompt["id"]))
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
                additionalInfoRequest=appeal["additionalInfoRequest"] if appeal else None,
                employeeResponse=appeal["employeeResponse"] if appeal else None,
                promptText=prompt["promptText"] if prompt else None,
                riskFindings=[
                    RiskFindingOut(category=f["category"], riskLevel=f["riskLevel"], note=f["note"])
                    for f in prompt["riskFindings"]
                ]
                if prompt
                else [],
                alertType=alert["alertType"],
                severity=alert["severity"],
                description=alert["description"],
            )
        )

    records.sort(key=lambda r: r.date, reverse=True)

    total_flags = len(records)
    # Derived from the displayed records (each has at most one attached
    # appeal) rather than the raw appeals table: a prompt block merged into
    # a Risk Alert can have a leftover, superseded appeal filed under the old
    # PROMPT_BLOCK source that no longer backs any visible flag, and counting
    # straight from `appeals` would double-count it.
    resolved_appeals = sum(1 for r in records if r.flagStatus in ("UPHELD", "OVERTURNED"))
    has_active_appeal = any(
        r.flagStatus in ("APPEAL_PENDING", "APPEAL_UNDER_REVIEW", "APPEAL_AWAITING_INFO")
        for r in records
    )

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
