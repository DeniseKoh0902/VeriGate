import uuid

import asyncpg


async def list_alerts_for_user(pool: asyncpg.Pool, user_id: str) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            'SELECT * FROM "risk_alerts" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
            user_id,
        )


async def get_alert_by_id(pool: asyncpg.Pool, alert_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow('SELECT * FROM "risk_alerts" WHERE "id" = $1', alert_id)


async def create_risk_alert(
    pool: asyncpg.Pool,
    *,
    user_id: str,
    prompt_id: str | None,
    alert_type: str,
    severity: str,
    description: str | None,
) -> asyncpg.Record:
    alert_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "risk_alerts"
                ("id", "userId", "promptId", "alertType", "severity", "description")
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            """,
            alert_id,
            user_id,
            prompt_id,
            alert_type,
            severity,
            description,
        )
