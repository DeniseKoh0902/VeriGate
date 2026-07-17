import asyncpg

# All queries here are read-only by design — the Governance Copilot explains
# and summarizes existing data, it never approves/rejects tools, modifies
# policies, or resolves alerts. Those stay human decisions.


async def list_policies(pool: asyncpg.Pool, *, department: str | None) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT "id", "name", "description", "severity", "appliesToDepartment"
            FROM "policies"
            WHERE "isActive" = true
              AND ($1::text IS NULL OR "appliesToDepartment" = $1 OR "appliesToDepartment" IS NULL)
            ORDER BY "createdAt" DESC
            """,
            department,
        )


async def get_ai_tool_status(pool: asyncpg.Pool, *, tool_name: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT
                t."name", t."vendor", t."riskTier", t."isApproved",
                e."securityScore", e."privacyScore", e."complianceScore",
                e."availabilityScore", e."explainabilityScore", e."orgPolicyScore",
                e."overallScore", e."evaluatedAt"
            FROM "ai_tools" t
            LEFT JOIN LATERAL (
                SELECT * FROM "ai_trust_evaluations" ev
                WHERE ev."aiToolId" = t."id"
                ORDER BY ev."evaluatedAt" DESC
                LIMIT 1
            ) e ON true
            WHERE t."name" ILIKE '%' || $1 || '%'
            LIMIT 1
            """,
            tool_name,
        )


async def get_top_risk_alerts(
    pool: asyncpg.Pool, *, days: int, limit: int
) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT "alertType", COUNT(*) AS count
            FROM "risk_alerts"
            WHERE "createdAt" >= NOW() - make_interval(days => $1)
            GROUP BY "alertType"
            ORDER BY count DESC
            LIMIT $2
            """,
            days,
            limit,
        )


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
            ),
            totals AS (
                SELECT COALESCE(SUM(alert_count), 0) AS total_alerts FROM alert_counts
            )
            SELECT
                a.department,
                a.alert_count,
                COALESCE(b.blocked_count, 0) AS blocked_count,
                ROUND(a.alert_count * 100.0 / NULLIF(t.total_alerts, 0), 1) AS alert_share_pct
            FROM alert_counts a
            LEFT JOIN blocked_counts b ON b.department = a.department
            CROSS JOIN totals t
            ORDER BY a.alert_count DESC
            """,
            days,
        )


async def get_recent_audit_logs(
    pool: asyncpg.Pool, *, entity_type: str | None, limit: int
) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT al."action", al."entityType", al."entityId", al."createdAt", u."name" AS "actorName"
            FROM "audit_logs" al
            JOIN "users" u ON u."id" = al."userId"
            WHERE ($1::text IS NULL OR al."entityType" = $1)
            ORDER BY al."createdAt" DESC
            LIMIT $2
            """,
            entity_type,
            limit,
        )


async def get_policy_recommendations(
    pool: asyncpg.Pool, *, status: str | None
) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT "title", "rationale", "department", "confidenceScore", "status", "generatedAt"
            FROM "policy_recommendations"
            WHERE ($1::text IS NULL OR "status" = $1::"RecommendationStatus")
            ORDER BY "generatedAt" DESC
            LIMIT 10
            """,
            status,
        )


async def get_governance_summary(pool: asyncpg.Pool, *, days: int) -> dict:
    async with pool.acquire() as conn:
        totals = await conn.fetchrow(
            """
            SELECT
                (SELECT COUNT(*) FROM "risk_alerts"
                    WHERE "createdAt" >= NOW() - make_interval(days => $1)) AS total_alerts,
                (SELECT COUNT(*) FROM "prompts"
                    WHERE "status" = 'BLOCKED' AND "createdAt" >= NOW() - make_interval(days => $1))
                    AS blocked_prompts,
                (SELECT COUNT(*) FROM "ai_tool_requests" WHERE "status" = 'PENDING')
                    AS pending_tool_requests
            """,
            days,
        )
        top_alert_type = await conn.fetchrow(
            """
            SELECT "alertType", COUNT(*) AS count
            FROM "risk_alerts"
            WHERE "createdAt" >= NOW() - make_interval(days => $1)
            GROUP BY "alertType"
            ORDER BY count DESC
            LIMIT 1
            """,
            days,
        )
        top_department = await conn.fetchrow(
            """
            SELECT u."department" AS department, COUNT(*) AS count
            FROM "risk_alerts" ra
            JOIN "users" u ON u."id" = ra."userId"
            WHERE ra."createdAt" >= NOW() - make_interval(days => $1)
            GROUP BY u."department"
            ORDER BY count DESC
            LIMIT 1
            """,
            days,
        )

    return {
        "totalAlerts": totals["total_alerts"],
        "blockedPrompts": totals["blocked_prompts"],
        "pendingToolRequests": totals["pending_tool_requests"],
        "topAlertType": dict(top_alert_type) if top_alert_type else None,
        "topDepartment": dict(top_department) if top_department else None,
    }