import asyncpg


async def get_daily_prompt_stats(pool: asyncpg.Pool, *, days: int) -> list[asyncpg.Record]:
    """One row per day for the trailing `days`-day window (oldest first), with
    zero-filled gaps — so a day with no prompts still produces a real 0 point
    for the sparklines instead of a hole in the trend."""
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            WITH days AS (
                SELECT generate_series(
                    CURRENT_DATE - make_interval(days => $1 - 1), CURRENT_DATE, interval '1 day'
                )::date AS day
            ),
            prompt_stats AS (
                SELECT date_trunc('day', "createdAt")::date AS day,
                       COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE "status" = 'BLOCKED') AS blocked
                FROM "prompts"
                WHERE "createdAt" >= CURRENT_DATE - make_interval(days => $1 - 1)
                GROUP BY 1
            ),
            response_stats AS (
                SELECT date_trunc('day', p."createdAt")::date AS day,
                       AVG(r."responseTimeMs") AS avg_latency
                FROM "prompts" p
                JOIN "ai_responses" r ON r."promptId" = p."id"
                WHERE p."createdAt" >= CURRENT_DATE - make_interval(days => $1 - 1)
                GROUP BY 1
            )
            SELECT d.day,
                   COALESCE(ps.total, 0) AS total,
                   COALESCE(ps.blocked, 0) AS blocked,
                   COALESCE(rs.avg_latency, 0) AS "avgLatency"
            FROM days d
            LEFT JOIN prompt_stats ps ON ps.day = d.day
            LEFT JOIN response_stats rs ON rs.day = d.day
            ORDER BY d.day
            """,
            days,
        )


async def list_recent_alerts(pool: asyncpg.Pool, *, limit: int) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT a."id", a."createdAt", a."alertType", a."severity", a."status",
                   t."name" AS "aiToolName"
            FROM "risk_alerts" a
            LEFT JOIN "prompts" p ON p."id" = a."promptId"
            LEFT JOIN "ai_sessions" s ON s."id" = p."sessionId"
            LEFT JOIN "ai_tools" t ON t."id" = s."aiToolId"
            ORDER BY a."createdAt" DESC
            LIMIT $1
            """,
            limit,
        )


async def get_risk_distribution_by_tool(pool: asyncpg.Pool, *, days: int) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT COALESCE(t."name", 'Unknown') AS label, COUNT(*) AS value
            FROM "risk_alerts" a
            LEFT JOIN "prompts" p ON p."id" = a."promptId"
            LEFT JOIN "ai_sessions" s ON s."id" = p."sessionId"
            LEFT JOIN "ai_tools" t ON t."id" = s."aiToolId"
            WHERE a."createdAt" >= NOW() - make_interval(days => $1)
            GROUP BY label
            ORDER BY value DESC
            """,
            days,
        )


async def get_compliance_score(pool: asyncpg.Pool) -> asyncpg.Record:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT
                (SELECT COUNT(*) FROM "prompts"
                    WHERE "createdAt" >= CURRENT_DATE) AS "todayTotal",
                (SELECT COUNT(*) FROM "prompts"
                    WHERE "createdAt" >= CURRENT_DATE AND "status" != 'BLOCKED') AS "todayOk",
                (SELECT COUNT(*) FROM "prompts"
                    WHERE "createdAt" >= CURRENT_DATE - interval '1 day'
                      AND "createdAt" < CURRENT_DATE) AS "yesterdayTotal",
                (SELECT COUNT(*) FROM "prompts"
                    WHERE "createdAt" >= CURRENT_DATE - interval '1 day'
                      AND "createdAt" < CURRENT_DATE AND "status" != 'BLOCKED') AS "yesterdayOk"
            """
        )


async def get_top_trust_scores(pool: asyncpg.Pool, *, limit: int) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT t."name" AS "toolName", t."riskTier",
                   e."overallScore", e."securityScore", e."complianceScore"
            FROM "ai_tools" t
            JOIN LATERAL (
                SELECT * FROM "ai_trust_evaluations" ev
                WHERE ev."aiToolId" = t."id"
                ORDER BY ev."evaluatedAt" DESC
                LIMIT 1
            ) e ON true
            ORDER BY e."overallScore" DESC
            LIMIT $1
            """,
            limit,
        )


async def get_usage_by_department(pool: asyncpg.Pool, *, days: int) -> list[asyncpg.Record]:
    """Prompt volume, block rate, active-user count, and most-used tool per
    department over the trailing `days`-day window — the department axis
    Prompt/AiSession don't carry directly, so this joins through to Users the
    same way governance_copilot_repository.get_department_alert_stats does,
    but scoped to overall usage rather than just alerts."""
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            WITH dept_stats AS (
                SELECT
                    u."department" AS department,
                    COUNT(*) AS "promptCount",
                    COUNT(*) FILTER (WHERE p."status" = 'BLOCKED') AS "blockedCount",
                    COUNT(DISTINCT u."id") AS "activeUsers"
                FROM "prompts" p
                JOIN "ai_sessions" s ON s."id" = p."sessionId"
                JOIN "users" u ON u."id" = s."userId"
                WHERE p."createdAt" >= NOW() - make_interval(days => $1)
                GROUP BY u."department"
            ),
            top_tool_ranked AS (
                SELECT
                    u."department" AS department,
                    t."name" AS tool_name,
                    ROW_NUMBER() OVER (
                        PARTITION BY u."department" ORDER BY COUNT(*) DESC
                    ) AS rn
                FROM "prompts" p
                JOIN "ai_sessions" s ON s."id" = p."sessionId"
                JOIN "users" u ON u."id" = s."userId"
                JOIN "ai_tools" t ON t."id" = s."aiToolId"
                WHERE p."createdAt" >= NOW() - make_interval(days => $1)
                GROUP BY u."department", t."name"
            )
            SELECT
                d.department,
                d."promptCount",
                d."blockedCount",
                d."activeUsers",
                tt.tool_name AS "topTool"
            FROM dept_stats d
            LEFT JOIN top_tool_ranked tt ON tt.department = d.department AND tt.rn = 1
            ORDER BY d."promptCount" DESC
            """,
            days,
        )


async def list_recent_ai_tools(pool: asyncpg.Pool, *, limit: int) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT "name" AS "toolName", "vendor", "isApproved", "riskTier"
            FROM "ai_tools"
            ORDER BY "createdAt" DESC
            LIMIT $1
            """,
            limit,
        )
