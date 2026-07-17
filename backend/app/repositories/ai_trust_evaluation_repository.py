import uuid

import asyncpg


async def create_trust_evaluation(
    pool: asyncpg.Pool,
    *,
    ai_tool_id: str,
    security_score: int,
    privacy_score: int,
    compliance_score: int,
    availability_score: int,
    explainability_score: int,
    org_policy_score: int,
    overall_score: int,
    evaluated_by_id: str,
) -> asyncpg.Record:
    evaluation_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "ai_trust_evaluations"
                ("id", "aiToolId", "securityScore", "privacyScore", "complianceScore",
                 "availabilityScore", "explainabilityScore", "orgPolicyScore",
                 "overallScore", "evaluatedById")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            """,
            evaluation_id,
            ai_tool_id,
            security_score,
            privacy_score,
            compliance_score,
            availability_score,
            explainability_score,
            org_policy_score,
            overall_score,
            evaluated_by_id,
        )


async def get_latest_trust_evaluation(
    pool: asyncpg.Pool, ai_tool_id: str
) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT * FROM "ai_trust_evaluations"
            WHERE "aiToolId" = $1
            ORDER BY "evaluatedAt" DESC
            LIMIT 1
            """,
            ai_tool_id,
        )
