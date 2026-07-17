import uuid

import asyncpg


async def create_audit_log(
    pool: asyncpg.Pool,
    *,
    user_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
) -> asyncpg.Record:
    log_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "audit_logs" ("id", "userId", "action", "entityType", "entityId")
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            """,
            log_id,
            user_id,
            action,
            entity_type,
            entity_id,
        )
