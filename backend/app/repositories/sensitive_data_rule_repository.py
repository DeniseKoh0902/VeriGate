import uuid

import asyncpg


async def list_sensitive_data_rules(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch('SELECT * FROM "sensitive_data_rules" ORDER BY "createdAt" DESC')


async def list_active_rules(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    """Rules actually enforced against submitted prompts — inactive rules
    are configured but intentionally not applied."""
    async with pool.acquire() as conn:
        return await conn.fetch('SELECT * FROM "sensitive_data_rules" WHERE "isActive" = true')


async def create_sensitive_data_rule(
    pool: asyncpg.Pool,
    *,
    category: str,
    risk_level: str,
    action: str,
    created_by_id: str,
) -> asyncpg.Record:
    rule_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "sensitive_data_rules"
                ("id", "category", "riskLevel", "action", "createdById")
            VALUES ($1, $2, $3::"RiskLevel", $4::"RuleAction", $5)
            RETURNING *
            """,
            rule_id,
            category,
            risk_level,
            action,
            created_by_id,
        )


async def update_sensitive_data_rule(
    pool: asyncpg.Pool,
    rule_id: str,
    *,
    category: str | None = None,
    risk_level: str | None = None,
    action: str | None = None,
    is_active: bool | None = None,
) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            UPDATE "sensitive_data_rules" SET
                "category" = COALESCE($2, "category"),
                "riskLevel" = COALESCE($3::"RiskLevel", "riskLevel"),
                "action" = COALESCE($4::"RuleAction", "action"),
                "isActive" = COALESCE($5, "isActive")
            WHERE "id" = $1
            RETURNING *
            """,
            rule_id,
            category,
            risk_level,
            action,
            is_active,
        )


async def delete_sensitive_data_rule(pool: asyncpg.Pool, rule_id: str) -> bool:
    async with pool.acquire() as conn:
        result = await conn.execute('DELETE FROM "sensitive_data_rules" WHERE "id" = $1', rule_id)
        return result != "DELETE 0"
