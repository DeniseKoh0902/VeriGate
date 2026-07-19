from app.db.pool import get_pool
from app.repositories import (
    ai_tool_repository,
    ai_tool_request_repository,
    ai_trust_evaluation_repository,
    audit_log_repository,
    user_repository,
)
from app.schemas.ai_tool_request import AiToolRequestCreate, AiToolRequestOut
from app.services.ai_tool_decision_notifier import (
    notify_governance_new_tool_request,
    notify_tool_decision,
)


async def list_my_requests(user_id: str) -> list[AiToolRequestOut]:
    pool = get_pool()
    rows = await ai_tool_request_repository.list_requests_by_user(pool, user_id)
    return [AiToolRequestOut(**dict(row)) for row in rows]


async def create_request(payload: AiToolRequestCreate, user_id: str) -> AiToolRequestOut:
    pool = get_pool()
    row = await ai_tool_request_repository.create_request(
        pool,
        user_id=user_id,
        tool_name=payload.toolName,
        business_reason=payload.businessReason,
        department=payload.department,
    )

    await audit_log_repository.create_audit_log(
        pool,
        user_id=user_id,
        action="AI Tool Request Submitted",
        entity_type="AiToolRequest",
        entity_id=row["id"],
    )

    existing_tool = await ai_tool_repository.get_ai_tool_by_name(pool, payload.toolName)

    if existing_tool is not None and existing_tool["riskTier"] in ("APPROVED", "BLOCKED"):
        # This exact tool name has already been decided (approved or rejected
        # via a trust evaluation for someone else's earlier request) — resolve
        # this new request with the same decision immediately instead of
        # leaving it pending for a redundant re-evaluation.
        latest_eval = await ai_trust_evaluation_repository.get_latest_trust_evaluation(
            pool, existing_tool["id"]
        )
        reviewer_id = (
            latest_eval["evaluatedById"] if latest_eval else existing_tool["approvedById"]
        )
        if reviewer_id is not None:
            is_approved = existing_tool["riskTier"] == "APPROVED"
            row = await ai_tool_request_repository.resolve_request(
                pool,
                row["id"],
                request_status="APPROVED" if is_approved else "REJECTED",
                reviewed_by_id=reviewer_id,
                approved_tool_id=existing_tool["id"] if is_approved else None,
                rejection_reason=existing_tool["decisionNotes"] if not is_approved else None,
            )
            await notify_tool_decision(
                pool,
                request_row=row,
                decision="APPROVED" if is_approved else "REJECTED",
                reason=existing_tool["decisionNotes"],
            )
    elif existing_tool is None:
        # Nobody has requested this tool before — register it as a Pending
        # Review placeholder so it actually shows up in AI Tool Management,
        # and tell governance reviewers it's waiting on them. Without this,
        # a request sits invisible to admins forever.
        new_tool = await ai_tool_repository.create_pending_ai_tool_by_name(pool, payload.toolName)
        requester = await user_repository.get_user_by_id(pool, user_id)
        await notify_governance_new_tool_request(
            pool,
            tool_id=new_tool["id"],
            tool_name=payload.toolName,
            requester_name=requester["name"] if requester else "An employee",
            business_reason=payload.businessReason,
        )

    return AiToolRequestOut(**dict(row))
