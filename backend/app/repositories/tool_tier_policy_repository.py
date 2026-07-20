import uuid

import asyncpg

_ADMIN_SELECT = """
    SELECT p.*, t."name" AS "aiToolName"
    FROM "tool_tier_policies" p
    LEFT JOIN "ai_tools" t ON t."id" = p."aiToolId"
"""


async def list_tool_tier_policies(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(f'{_ADMIN_SELECT} ORDER BY p."createdAt" DESC')


async def list_active_policies_for_tool(
    pool: asyncpg.Pool, ai_tool_id: str, tool_tier: str
) -> list[asyncpg.Record]:
    """Active policies relevant to this tool: rows scoped to it specifically
    (aiToolId = ai_tool_id) plus the class-level rules for its tier
    (aiToolId IS NULL). prompt_service prefers a specific-tool match over a
    tier-generic one for the same category — that's resolved in Python, not
    here, since asyncpg records don't carry that precedence themselves."""
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT * FROM "tool_tier_policies"
            WHERE "isActive" = true
              AND (
                "aiToolId" = $1
                OR ("aiToolId" IS NULL AND "toolTier" = $2::"AiToolRiskTier")
              )
            """,
            ai_tool_id,
            tool_tier,
        )


async def create_tool_tier_policy(
    pool: asyncpg.Pool,
    *,
    tool_tier: str,
    ai_tool_id: str | None,
    category: str,
    risk_level: str,
    action: str,
    created_by_id: str,
) -> asyncpg.Record:
    policy_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO "tool_tier_policies"
                ("id", "toolTier", "aiToolId", "category", "riskLevel", "action", "createdById")
            VALUES ($1, $2::"AiToolRiskTier", $3, $4, $5::"RiskLevel", $6::"RuleAction", $7)
            RETURNING *
            """,
            policy_id,
            tool_tier,
            ai_tool_id,
            category,
            risk_level,
            action,
            created_by_id,
        )
    return await get_admin_policy_by_id(pool, row["id"])


async def get_admin_policy_by_id(pool: asyncpg.Pool, policy_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(f'{_ADMIN_SELECT} WHERE p."id" = $1', policy_id)


async def update_tool_tier_policy(
    pool: asyncpg.Pool,
    policy_id: str,
    *,
    tool_tier: str | None = None,
    ai_tool_id: str | None = None,
    category: str | None = None,
    risk_level: str | None = None,
    action: str | None = None,
    is_active: bool | None = None,
) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        updated = await conn.fetchrow(
            """
            UPDATE "tool_tier_policies" SET
                "toolTier" = COALESCE($2::"AiToolRiskTier", "toolTier"),
                "aiToolId" = COALESCE($3, "aiToolId"),
                "category" = COALESCE($4, "category"),
                "riskLevel" = COALESCE($5::"RiskLevel", "riskLevel"),
                "action" = COALESCE($6::"RuleAction", "action"),
                "isActive" = COALESCE($7, "isActive")
            WHERE "id" = $1
            RETURNING *
            """,
            policy_id,
            tool_tier,
            ai_tool_id,
            category,
            risk_level,
            action,
            is_active,
        )
    if updated is None:
        return None
    return await get_admin_policy_by_id(pool, policy_id)


async def delete_tool_tier_policy(pool: asyncpg.Pool, policy_id: str) -> bool:
    async with pool.acquire() as conn:
        result = await conn.execute('DELETE FROM "tool_tier_policies" WHERE "id" = $1', policy_id)
        return result != "DELETE 0"
