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


async def has_recent_notification(
    pool: asyncpg.Pool, *, notification_type: str, related_entity_id: str, minutes: int
) -> bool:
    """Dedup check so e.g. ten employees hitting the same unconfigured
    provider in one afternoon fires one notification per admin, not ten."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT 1 FROM "notifications"
            WHERE "type" = $1 AND "relatedEntityId" = $2
              AND "createdAt" >= NOW() - make_interval(mins => $3)
            LIMIT 1
            """,
            notification_type,
            related_entity_id,
            minutes,
        )
        return row is not None


async def list_notifications_for_user(
    pool: asyncpg.Pool, user_id: str, *, limit: int = 50
) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT * FROM "notifications"
            WHERE "userId" = $1
            ORDER BY "createdAt" DESC
            LIMIT $2
            """,
            user_id,
            limit,
        )


async def count_unread(pool: asyncpg.Pool, user_id: str) -> int:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT COUNT(*) AS "count" FROM "notifications" WHERE "userId" = $1 AND "isRead" = false',
            user_id,
        )
        return row["count"]


async def mark_read(pool: asyncpg.Pool, notification_id: str, user_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            UPDATE "notifications" SET "isRead" = true
            WHERE "id" = $1 AND "userId" = $2
            RETURNING *
            """,
            notification_id,
            user_id,
        )


async def mark_all_read(pool: asyncpg.Pool, user_id: str) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE "notifications" SET "isRead" = true WHERE "userId" = $1 AND "isRead" = false',
            user_id,
        )
