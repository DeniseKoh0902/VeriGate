from app.db.pool import get_pool
from app.repositories import ai_tool_request_repository
from app.repositories.user_repository import get_or_create_system_user
from app.schemas.ai_tool_request import AiToolRequestCreate, AiToolRequestOut


async def list_my_requests() -> list[AiToolRequestOut]:
    pool = get_pool()
    # TODO: replace with the authenticated employee's user id once real login is wired up.
    user_id = await get_or_create_system_user(pool)
    rows = await ai_tool_request_repository.list_requests_by_user(pool, user_id)
    return [AiToolRequestOut(**dict(row)) for row in rows]


async def create_request(payload: AiToolRequestCreate) -> AiToolRequestOut:
    pool = get_pool()
    # TODO: replace with the authenticated employee's user id once real login is wired up.
    user_id = await get_or_create_system_user(pool)
    row = await ai_tool_request_repository.create_request(
        pool,
        user_id=user_id,
        tool_name=payload.toolName,
        business_reason=payload.businessReason,
        department=payload.department,
    )
    return AiToolRequestOut(**dict(row))
