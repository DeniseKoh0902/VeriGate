import uuid

import asyncpg


async def list_requests_by_user(pool: asyncpg.Pool, user_id: str) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            'SELECT * FROM "ai_tool_requests" WHERE "userId" = $1 ORDER BY "submittedAt" DESC',
            user_id,
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
