import uuid

import asyncpg


async def list_all(pool: asyncpg.Pool, *, status: str | None = None) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT * FROM "policy_recommendations"
            WHERE ($1::text IS NULL OR "status" = $1::"RecommendationStatus")
            ORDER BY "generatedAt" DESC
            """,
            status,
        )


async def get_by_id(pool: asyncpg.Pool, recommendation_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            'SELECT * FROM "policy_recommendations" WHERE "id" = $1', recommendation_id
        )


async def create_recommendation(
    pool: asyncpg.Pool,
    *,
    title: str,
    rationale: str,
    department: str | None,
    confidence_score: int,
) -> asyncpg.Record:
    recommendation_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "policy_recommendations"
                ("id", "title", "rationale", "department", "confidenceScore")
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            """,
            recommendation_id,
            title,
            rationale,
            department,
            confidence_score,
        )


async def update_review(
    pool: asyncpg.Pool,
    recommendation_id: str,
    *,
    status: str,
    reviewed_by_id: str,
    title: str | None = None,
    rationale: str | None = None,
) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            UPDATE "policy_recommendations" SET
                "title" = COALESCE($3, "title"),
                "rationale" = COALESCE($4, "rationale"),
                "status" = $2::"RecommendationStatus",
                "reviewedById" = $5,
                "reviewedAt" = NOW()
            WHERE "id" = $1
            RETURNING *
            """,
            recommendation_id,
            status,
            title,
            rationale,
            reviewed_by_id,
        )


# The remaining queries feed the AI generator with real usage/risk signals to
# ground its suggestions in, rather than letting it invent patterns.


async def get_department_alert_stats(pool: asyncpg.Pool, *, days: int) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            WITH alert_counts AS (
                SELECT u."department" AS department, COUNT(*) AS alert_count
                FROM "risk_alerts" ra
                JOIN "users" u ON u."id" = ra."userId"
                WHERE ra."createdAt" >= NOW() - make_interval(days => $1)
                GROUP BY u."department"
            ),
            blocked_counts AS (
                SELECT u."department" AS department, COUNT(*) AS blocked_count
                FROM "prompts" p
                JOIN "ai_sessions" s ON s."id" = p."sessionId"
                JOIN "users" u ON u."id" = s."userId"
                WHERE p."status" = 'BLOCKED' AND p."createdAt" >= NOW() - make_interval(days => $1)
                GROUP BY u."department"
            )
            SELECT
                a.department,
                a.alert_count,
                COALESCE(b.blocked_count, 0) AS blocked_count
            FROM alert_counts a
            LEFT JOIN blocked_counts b ON b.department = a.department
            ORDER BY a.alert_count DESC
            """,
            days,
        )


async def get_top_alert_types(pool: asyncpg.Pool, *, days: int, limit: int) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT "alertType", "severity", COUNT(*) AS count
            FROM "risk_alerts"
            WHERE "createdAt" >= NOW() - make_interval(days => $1)
            GROUP BY "alertType", "severity"
            ORDER BY count DESC
            LIMIT $2
            """,
            days,
            limit,
        )


async def get_tool_risk_snapshot(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT
                t."name", t."vendor", t."riskTier", t."isApproved",
                e."overallScore", e."evaluatedAt"
            FROM "ai_tools" t
            LEFT JOIN LATERAL (
                SELECT * FROM "ai_trust_evaluations" ev
                WHERE ev."aiToolId" = t."id"
                ORDER BY ev."evaluatedAt" DESC
                LIMIT 1
            ) e ON true
            ORDER BY t."name"
            """
        )
