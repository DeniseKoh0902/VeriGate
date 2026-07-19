import uuid

import asyncpg


async def create_trust_evaluation(
    pool: asyncpg.Pool,
    *,
    ai_tool_id: str,
    security_score: int,
    security_reason: str,
    privacy_score: int,
    privacy_reason: str,
    compliance_score: int,
    compliance_reason: str,
    availability_score: int,
    availability_reason: str,
    explainability_score: int,
    explainability_reason: str,
    org_policy_score: int,
    org_policy_reason: str,
    overall_score: int,
    justification: str,
    evaluated_by_id: str,
) -> asyncpg.Record:
    evaluation_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "ai_trust_evaluations"
                ("id", "aiToolId", "securityScore", "securityReason", "privacyScore", "privacyReason",
                 "complianceScore", "complianceReason", "availabilityScore", "availabilityReason",
                 "explainabilityScore", "explainabilityReason", "orgPolicyScore", "orgPolicyReason",
                 "overallScore", "justification", "evaluatedById")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
            """,
            evaluation_id,
            ai_tool_id,
            security_score,
            security_reason,
            privacy_score,
            privacy_reason,
            compliance_score,
            compliance_reason,
            availability_score,
            availability_reason,
            explainability_score,
            explainability_reason,
            org_policy_score,
            org_policy_reason,
            overall_score,
            justification,
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
