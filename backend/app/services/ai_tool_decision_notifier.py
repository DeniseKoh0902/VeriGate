import logging

import asyncpg

from app.core.email import send_email
from app.repositories import notification_repository, user_repository

logger = logging.getLogger(__name__)


async def notify_tool_decision(
    pool: asyncpg.Pool,
    *,
    request_row: asyncpg.Record,
    decision: str,
    reason: str | None,
) -> None:
    """Notifies (in-app + email) the employee who filed an AiToolRequest once
    it's resolved — whether that happens right when an admin decides it, or
    later when a duplicate request for the same tool is auto-resolved."""
    user = await user_repository.get_user_by_id(pool, request_row["userId"])
    if user is None:
        return

    tool_name = request_row["toolName"]
    if decision == "APPROVED":
        title = f'Your AI tool request for "{tool_name}" was approved'
        message = f'"{tool_name}" has been approved and is now available to use in AI Workspace.'
    else:
        title = f'Your AI tool request for "{tool_name}" was rejected'
        message = reason or f'"{tool_name}" was not approved for use.'

    await notification_repository.create_notification(
        pool,
        user_id=request_row["userId"],
        title=title,
        message=message,
        notification_type="AI_TOOL_REQUEST_RESOLVED",
        related_entity_type="AiToolRequest",
        related_entity_id=request_row["id"],
    )

    try:
        await send_email(
            to=user["email"],
            subject=title,
            html_body=f"<p>Hi {user['name']},</p><p>{message}</p>",
        )
    except Exception:
        logger.error("Failed to send AI tool decision email to %s", user["email"])


async def notify_tool_access_revoked(
    pool: asyncpg.Pool,
    *,
    request_row: asyncpg.Record,
    reason: str | None,
) -> None:
    """Notifies (in-app + email) an employee whose previously-approved AI
    tool access was just disabled — without this, they'd only find out the
    next time a prompt to it gets rejected."""
    user = await user_repository.get_user_by_id(pool, request_row["userId"])
    if user is None:
        return

    tool_name = request_row["toolName"]
    title = f'Access to "{tool_name}" has been revoked'
    message = reason or f'"{tool_name}" is no longer approved for use.'

    await notification_repository.create_notification(
        pool,
        user_id=request_row["userId"],
        title=title,
        message=message,
        notification_type="AI_TOOL_ACCESS_REVOKED",
        related_entity_type="AiToolRequest",
        related_entity_id=request_row["id"],
    )

    try:
        await send_email(
            to=user["email"],
            subject=title,
            html_body=f"<p>Hi {user['name']},</p><p>{message}</p>",
        )
    except Exception:
        logger.error("Failed to send access-revoked email to %s", user["email"])


async def notify_governance_drift_flagged(
    pool: asyncpg.Pool,
    *,
    scan_id: str,
    tool_name: str,
    block_rate: float,
    sensitive_data_match_rate: float,
) -> None:
    """Notifies (in-app + email) every ADMIN/COMPLIANCE user that a usage
    scan found this tool's real block/sensitive-data rate has drifted —
    triggered by the numbers in AiToolUsageScan, not by an LLM's opinion."""
    reviewers = await user_repository.list_governance_users(pool)
    title = f'Usage drift flagged: "{tool_name}"'
    message = (
        f'"{tool_name}" is blocking {block_rate:.0%} of prompts and flagging '
        f'{sensitive_data_match_rate:.0%} for sensitive data over the last 7 days — '
        "high enough to warrant review."
    )

    for reviewer in reviewers:
        await notification_repository.create_notification(
            pool,
            user_id=reviewer["id"],
            title=title,
            message=message,
            notification_type="AI_TOOL_USAGE_DRIFT_FLAGGED",
            related_entity_type="AiToolUsageScan",
            related_entity_id=scan_id,
        )
        try:
            await send_email(
                to=reviewer["email"],
                subject=title,
                html_body=f"<p>Hi {reviewer['name']},</p><p>{message}</p>",
            )
        except Exception:
            logger.error("Failed to send drift-flagged email to %s", reviewer["email"])


async def notify_governance_trust_score_regressed(
    pool: asyncpg.Pool,
    *,
    tool_id: str,
    tool_name: str,
    current_score: int,
    previous_score: int,
    threshold: int,
) -> None:
    """Notifies (in-app + email) every ADMIN/COMPLIANCE user that a tool's
    trust score dropped below its previous evaluation AND below the
    approval threshold — a regression, not just a low score that's always
    been low."""
    reviewers = await user_repository.list_governance_users(pool)
    title = f'Trust score regression: "{tool_name}"'
    message = (
        f'"{tool_name}" fell from {previous_score} to {current_score}, below the '
        f"{threshold} approval threshold. Review recommended."
    )

    for reviewer in reviewers:
        await notification_repository.create_notification(
            pool,
            user_id=reviewer["id"],
            title=title,
            message=message,
            notification_type="AI_TOOL_TRUST_SCORE_REGRESSED",
            related_entity_type="AiTool",
            related_entity_id=tool_id,
        )
        try:
            await send_email(
                to=reviewer["email"],
                subject=title,
                html_body=f"<p>Hi {reviewer['name']},</p><p>{message}</p>",
            )
        except Exception:
            logger.error("Failed to send trust-score-regression email to %s", reviewer["email"])


async def notify_governance_new_tool_request(
    pool: asyncpg.Pool,
    *,
    tool_id: str,
    tool_name: str,
    requester_name: str,
    business_reason: str,
) -> None:
    """Notifies (in-app + email) every ADMIN user that a newly requested AI
    tool needs review, since a request alone doesn't put anything in front
    of an admin otherwise — they'd have no way to know to go
    register/evaluate it in AI Tool Management."""
    reviewers = await user_repository.list_governance_users(pool)
    title = f'New AI tool request: "{tool_name}"'
    message = f'{requester_name} requested access to "{tool_name}" — {business_reason}'

    for reviewer in reviewers:
        await notification_repository.create_notification(
            pool,
            user_id=reviewer["id"],
            title=title,
            message=message,
            notification_type="AI_TOOL_REQUEST_SUBMITTED",
            related_entity_type="AiTool",
            related_entity_id=tool_id,
        )
        try:
            await send_email(
                to=reviewer["email"],
                subject=title,
                html_body=f"<p>Hi {reviewer['name']},</p><p>{message}</p>",
            )
        except Exception:
            logger.error("Failed to send new-request email to %s", reviewer["email"])
