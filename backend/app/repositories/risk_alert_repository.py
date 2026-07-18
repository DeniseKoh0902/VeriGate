import uuid

import asyncpg

# Joins in the employee and (when the alert traces back to a prompt) the AI
# tool it was submitted through — everything the admin-facing Risk Alert
# Center needs beyond the bare risk_alerts row.
_ADMIN_SELECT = """
    SELECT
        a.*,
        u."name" AS "employeeName",
        u."email" AS "employeeEmail",
        t."name" AS "aiToolName"
    FROM "risk_alerts" a
    JOIN "users" u ON u."id" = a."userId"
    LEFT JOIN "prompts" p ON p."id" = a."promptId"
    LEFT JOIN "ai_sessions" s ON s."id" = p."sessionId"
    LEFT JOIN "ai_tools" t ON t."id" = s."aiToolId"
"""


async def list_alerts_for_user(pool: asyncpg.Pool, user_id: str) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            'SELECT * FROM "risk_alerts" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
            user_id,
        )


async def get_alert_by_id(pool: asyncpg.Pool, alert_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow('SELECT * FROM "risk_alerts" WHERE "id" = $1', alert_id)


async def list_all_alerts(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(f'{_ADMIN_SELECT} ORDER BY a."createdAt" DESC')


async def get_admin_alert_by_id(pool: asyncpg.Pool, alert_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(f'{_ADMIN_SELECT} WHERE a."id" = $1', alert_id)


async def update_status(pool: asyncpg.Pool, alert_id: str, alert_status: str) -> bool:
    async with pool.acquire() as conn:
        result = await conn.execute(
            'UPDATE "risk_alerts" SET "status" = $2::"AlertStatus" WHERE "id" = $1',
            alert_id,
            alert_status,
        )
        return result != "UPDATE 0"


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
