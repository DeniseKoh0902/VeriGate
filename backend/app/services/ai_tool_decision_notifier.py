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


async def notify_governance_new_tool_request(
    pool: asyncpg.Pool,
    *,
    tool_id: str,
    tool_name: str,
    requester_name: str,
    business_reason: str,
) -> None:
    """Notifies (in-app + email) every ADMIN/COMPLIANCE user that a newly
    requested AI tool needs review, since a request alone doesn't put
    anything in front of an admin otherwise — they'd have no way to know to
    go register/evaluate it in AI Tool Management."""
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
