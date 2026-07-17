import uuid

import asyncpg


async def get_or_create_ai_tool_by_name(pool: asyncpg.Pool, name: str) -> asyncpg.Record:
    """Looks up an AiTool by display name, creating a placeholder row if it
    doesn't exist yet — AI Tool Management isn't connected to the backend
    yet, so this stands in for a real registered/approved tool until it is."""
    async with pool.acquire() as conn:
        existing = await conn.fetchrow('SELECT * FROM "ai_tools" WHERE "name" = $1', name)
        if existing:
            return existing

        tool_id = str(uuid.uuid4())
        return await conn.fetchrow(
            """
            INSERT INTO "ai_tools" ("id", "name", "vendor", "isApproved", "updatedAt")
            VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)
            RETURNING *
            """,
            tool_id,
            name,
            "Unknown",
        )
