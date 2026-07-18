import uuid

import asyncpg

_ADMIN_SELECT = """
    SELECT
        a.*,
        u."name" AS "employeeName",
        u."email" AS "employeeEmail",
        u."department" AS "department",
        t."name" AS "aiToolName"
    FROM "audit_logs" a
    LEFT JOIN "users" u ON u."id" = a."userId"
    LEFT JOIN "prompts" p ON a."entityType" = 'Prompt' AND p."id" = a."entityId"
    LEFT JOIN "ai_sessions" s ON s."id" = p."sessionId"
    LEFT JOIN "ai_tools" t ON t."id" = s."aiToolId"
"""


async def create_audit_log(
    pool: asyncpg.Pool,
    *,
    user_id: str | None,
    action: str,
    entity_type: str,
    entity_id: str,
    snapshot: str | None = None,
) -> asyncpg.Record:
    log_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "audit_logs" ("id", "userId", "action", "entityType", "entityId", "snapshot")
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            """,
            log_id,
            user_id,
            action,
            entity_type,
            entity_id,
            snapshot,
        )


async def list_all_logs(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(f'{_ADMIN_SELECT} ORDER BY a."createdAt" DESC')


async def get_log_by_id(pool: asyncpg.Pool, log_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(f'{_ADMIN_SELECT} WHERE a."id" = $1', log_id)
