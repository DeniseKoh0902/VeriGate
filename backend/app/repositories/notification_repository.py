import uuid

import asyncpg


async def create_notification(
    pool: asyncpg.Pool,
    *,
    user_id: str,
    title: str,
    message: str,
    notification_type: str,
    related_entity_type: str | None = None,
    related_entity_id: str | None = None,
) -> asyncpg.Record:
    notification_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "notifications"
                ("id", "userId", "title", "message", "type", "relatedEntityType", "relatedEntityId")
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            """,
            notification_id,
            user_id,
            title,
            message,
            notification_type,
            related_entity_type,
            related_entity_id,
        )
