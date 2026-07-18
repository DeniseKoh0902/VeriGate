from app.db.pool import get_pool
from app.repositories import ai_tool_request_repository, audit_log_repository
from app.schemas.ai_tool_request import AiToolRequestCreate, AiToolRequestOut


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

    return AiToolRequestOut(**dict(row))
