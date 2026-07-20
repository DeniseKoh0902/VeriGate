import uuid

import asyncpg


async def list_use_case_policies(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch('SELECT * FROM "use_case_policies" ORDER BY "createdAt" DESC')


async def list_active_policies(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    """Policies actually enforced against submitted prompts — inactive rows
    are configured but intentionally not applied."""
    async with pool.acquire() as conn:
        return await conn.fetch('SELECT * FROM "use_case_policies" WHERE "isActive" = true')


async def get_policy_by_id(pool: asyncpg.Pool, policy_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow('SELECT * FROM "use_case_policies" WHERE "id" = $1', policy_id)


async def create_use_case_policy(
    pool: asyncpg.Pool,
    *,
    use_case: str,
    description: str | None,
    risk_level: str,
    action: str,
    min_confidence: int,
    created_by_id: str,
) -> asyncpg.Record:
    policy_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "use_case_policies"
                ("id", "useCase", "description", "riskLevel", "action", "minConfidence", "createdById")
            VALUES ($1, $2, $3, $4::"RiskLevel", $5::"RuleAction", $6, $7)
            RETURNING *
            """,
            policy_id,
            use_case,
            description,
            risk_level,
            action,
            min_confidence,
            created_by_id,
        )


async def update_use_case_policy(
    pool: asyncpg.Pool,
    policy_id: str,
    *,
    use_case: str | None = None,
    description: str | None = None,
    risk_level: str | None = None,
    action: str | None = None,
    min_confidence: int | None = None,
    is_active: bool | None = None,
) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            UPDATE "use_case_policies" SET
                "useCase" = COALESCE($2, "useCase"),
                "description" = COALESCE($3, "description"),
                "riskLevel" = COALESCE($4::"RiskLevel", "riskLevel"),
                "action" = COALESCE($5::"RuleAction", "action"),
                "minConfidence" = COALESCE($6, "minConfidence"),
                "isActive" = COALESCE($7, "isActive")
            WHERE "id" = $1
            RETURNING *
            """,
            policy_id,
            use_case,
            description,
            risk_level,
            action,
            min_confidence,
            is_active,
        )


async def delete_use_case_policy(pool: asyncpg.Pool, policy_id: str) -> bool:
    async with pool.acquire() as conn:
        result = await conn.execute('DELETE FROM "use_case_policies" WHERE "id" = $1', policy_id)
        return result != "DELETE 0"
