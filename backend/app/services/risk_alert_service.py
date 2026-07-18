import asyncpg
from fastapi import HTTPException, status

from app.db.pool import get_pool
from app.repositories import (
    appeal_repository,
    audit_log_repository,
    prompt_repository,
    risk_alert_repository,
)
from app.schemas.prompt import RiskFindingOut
from app.schemas.risk_alert import RiskAlertAdminOut


async def _resolve_linked_appeal(pool: asyncpg.Pool, alert: asyncpg.Record) -> asyncpg.Record | None:
    """A risk alert can be appealed under its own id, or — for a prompt block
    merged into this alert before the appealable-source fallback existed —
    under the prompt's legacy PROMPT_BLOCK source. Same lookup order as
    compliance_service."""
    appeal = await appeal_repository.get_appeal_by_source_any_user(
        pool, source_type="RISK_ALERT", source_id=alert["id"]
    )
    if appeal is None and alert["promptId"]:
        appeal = await appeal_repository.get_appeal_by_source_any_user(
            pool, source_type="PROMPT_BLOCK", source_id=alert["promptId"]
        )
    return appeal


async def _to_admin_out(
    pool: asyncpg.Pool, row: asyncpg.Record, appeal: asyncpg.Record | None
) -> RiskAlertAdminOut:
    prompt = await prompt_repository.get_prompt_by_id(pool, row["promptId"]) if row["promptId"] else None

    return RiskAlertAdminOut(
        id=row["id"],
        alertType=row["alertType"],
        severity=row["severity"],
        description=row["description"],
        status=row["status"],
        createdAt=row["createdAt"],
        employeeName=row["employeeName"],
        employeeEmail=row["employeeEmail"],
        aiToolName=row["aiToolName"],
        promptText=prompt["promptText"] if prompt else None,
        riskFindings=[
            RiskFindingOut(category=f["category"], riskLevel=f["riskLevel"], note=f["note"])
            for f in prompt["riskFindings"]
        ]
        if prompt
        else [],
        appealStatus=appeal["status"] if appeal else None,
        appealResolution=appeal["resolution"] if appeal else None,
    )


async def list_all_alerts() -> list[RiskAlertAdminOut]:
    pool = get_pool()
    rows = await risk_alert_repository.list_all_alerts(pool)
    appeals = await appeal_repository.list_all_appeals(pool)
    appeals_by_source = {(a["sourceType"], a["sourceId"]): a for a in appeals}

    results: list[RiskAlertAdminOut] = []
    for row in rows:
        appeal = appeals_by_source.get(("RISK_ALERT", row["id"]))
        if appeal is None and row["promptId"]:
            appeal = appeals_by_source.get(("PROMPT_BLOCK", row["promptId"]))
        results.append(await _to_admin_out(pool, row, appeal))
    return results


async def _set_status(alert_id: str, alert_status: str, reviewer_id: str) -> RiskAlertAdminOut:
    pool = get_pool()
    updated = await risk_alert_repository.update_status(pool, alert_id, alert_status)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Risk alert not found.")

    await audit_log_repository.create_audit_log(
        pool,
        user_id=reviewer_id,
        action=f"Risk Alert {alert_status.title()}",
        entity_type="RiskAlert",
        entity_id=alert_id,
    )

    row = await risk_alert_repository.get_admin_alert_by_id(pool, alert_id)
    appeal = await _resolve_linked_appeal(pool, row)
    return await _to_admin_out(pool, row, appeal)


async def resolve_alert(alert_id: str, reviewer_id: str) -> RiskAlertAdminOut:
    return await _set_status(alert_id, "RESOLVED", reviewer_id)


async def escalate_alert(alert_id: str, reviewer_id: str) -> RiskAlertAdminOut:
    return await _set_status(alert_id, "ESCALATED", reviewer_id)
