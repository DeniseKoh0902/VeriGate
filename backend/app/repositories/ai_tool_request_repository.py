import uuid

import asyncpg


async def list_requests_by_user(pool: asyncpg.Pool, user_id: str) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            'SELECT * FROM "ai_tool_requests" WHERE "userId" = $1 ORDER BY "submittedAt" DESC',
            user_id,
        )


async def get_request_by_id(pool: asyncpg.Pool, request_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow('SELECT * FROM "ai_tool_requests" WHERE "id" = $1', request_id)


async def list_pending_requests_by_tool_name(
    pool: asyncpg.Pool, tool_name: str
) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            'SELECT * FROM "ai_tool_requests" WHERE "toolName" = $1 AND "status" = \'PENDING\'',
            tool_name,
        )


async def list_rejected_requests_by_tool_name(
    pool: asyncpg.Pool, tool_name: str
) -> list[asyncpg.Record]:
    """Every rejected request for this tool name, not just the one behind a
    given appeal — when an overturned appeal proves the tool itself wasn't
    the problem, every employee who was turned down for it benefits, same as
    a fresh APPROVED trust evaluation resolves every pending request for the
    tool at once."""
    async with pool.acquire() as conn:
        return await conn.fetch(
            'SELECT * FROM "ai_tool_requests" WHERE "toolName" = $1 AND "status" = \'REJECTED\'',
            tool_name,
        )


async def list_approved_requests_by_tool_id(
    pool: asyncpg.Pool, tool_id: str
) -> list[asyncpg.Record]:
    """Employees currently granted access via this tool — used when an admin
    disables a previously-approved tool, so everyone whose access just got
    revoked can be told, instead of silently hitting a 403 on their next
    prompt."""
    async with pool.acquire() as conn:
        return await conn.fetch(
            'SELECT * FROM "ai_tool_requests" WHERE "approvedToolId" = $1 AND "status" = \'APPROVED\'',
            tool_id,
        )


async def resolve_request(
    pool: asyncpg.Pool,
    request_id: str,
    *,
    request_status: str,
    reviewed_by_id: str,
    approved_tool_id: str | None = None,
    rejection_reason: str | None = None,
) -> asyncpg.Record:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            UPDATE "ai_tool_requests" SET
                "status" = $2::"RequestStatus",
                "approvedToolId" = $3,
                "rejectionReason" = $4,
                "reviewedById" = $5,
                "reviewedAt" = CURRENT_TIMESTAMP
            WHERE "id" = $1
            RETURNING *
            """,
            request_id,
            request_status,
            approved_tool_id,
            rejection_reason,
            reviewed_by_id,
        )


async def create_request(
    pool: asyncpg.Pool,
    *,
    user_id: str,
    tool_name: str,
    business_reason: str,
    department: str,
) -> asyncpg.Record:
    request_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "ai_tool_requests"
                ("id", "userId", "toolName", "businessReason", "department")
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            """,
            request_id,
            user_id,
            tool_name,
            business_reason,
            department,
        )
