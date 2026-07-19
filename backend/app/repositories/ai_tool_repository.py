import uuid

import asyncpg

_LIST_SELECT = """
    SELECT t.*, e."overallScore"
    FROM "ai_tools" t
    LEFT JOIN LATERAL (
        SELECT "overallScore" FROM "ai_trust_evaluations" ev
        WHERE ev."aiToolId" = t."id"
        ORDER BY ev."evaluatedAt" DESC
        LIMIT 1
    ) e ON true
"""


async def get_or_create_ai_tool_by_name(pool: asyncpg.Pool, name: str) -> asyncpg.Record:
    """Looks up an AiTool by display name, creating a placeholder row if it
    doesn't exist yet — lets AI Workspace reference a model name that hasn't
    been formally registered through AI Tool Management."""
    async with pool.acquire() as conn:
        existing = await conn.fetchrow('SELECT * FROM "ai_tools" WHERE "name" = $1', name)
        if existing:
            return existing

        tool_id = str(uuid.uuid4())
        return await conn.fetchrow(
            """
            INSERT INTO "ai_tools" ("id", "name", "vendor", "isApproved", "updatedAt")
            VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)
            RETURNING *
            """,
            tool_id,
            name,
            "Unknown",
        )


async def get_ai_tool_by_name(pool: asyncpg.Pool, name: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(f'{_LIST_SELECT} WHERE t."name" = $1', name)


async def create_pending_ai_tool_by_name(pool: asyncpg.Pool, name: str) -> asyncpg.Record:
    """Creates a Pending Review placeholder AiTool row for a name that isn't
    registered yet — used when an employee's AI Tool Request references a
    tool nobody has registered, so it shows up in AI Tool Management for an
    admin to evaluate. Unlike get_or_create_ai_tool_by_name (AI Workspace's
    auto-approving lookup), this deliberately leaves riskTier/isApproved at
    their unapproved defaults — a request must never silently grant access."""
    tool_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO "ai_tools" ("id", "name", "vendor", "updatedAt")
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            RETURNING *
            """,
            tool_id,
            name,
            "Unknown",
        )
    return {**dict(row), "overallScore": None}


async def list_ai_tools(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(f'{_LIST_SELECT} ORDER BY t."createdAt" DESC')


async def list_approved_tools(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    """Tools currently APPROVED for use — the only ones AI Workspace should
    let an employee pick from, kept in sync with AI Tool Management's status
    column instead of a static frontend list."""
    async with pool.acquire() as conn:
        return await conn.fetch(
            f'{_LIST_SELECT} WHERE t."riskTier" = \'APPROVED\' '
            'ORDER BY e."overallScore" DESC NULLS LAST, t."name"'
        )


async def get_ai_tool(pool: asyncpg.Pool, tool_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(f'{_LIST_SELECT} WHERE t."id" = $1', tool_id)


async def create_ai_tool(
    pool: asyncpg.Pool,
    *,
    name: str,
    vendor: str,
    version: str | None,
    endpoint: str | None,
    description: str | None,
    risk_tier: str,
) -> asyncpg.Record:
    tool_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO "ai_tools"
                ("id", "name", "vendor", "version", "endpoint", "description", "riskTier", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7::"AiToolRiskTier", CURRENT_TIMESTAMP)
            RETURNING *
            """,
            tool_id,
            name,
            vendor,
            version,
            endpoint,
            description,
            risk_tier,
        )
    return {**dict(row), "overallScore": None}


async def update_ai_tool(
    pool: asyncpg.Pool,
    tool_id: str,
    *,
    vendor: str | None = None,
    version: str | None = None,
    endpoint: str | None = None,
    description: str | None = None,
    risk_tier: str | None = None,
    is_approved: bool | None = None,
    approved_by_id: str | None = None,
    decision_notes: str | None = None,
) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE "ai_tools" SET
                "vendor" = COALESCE($2, "vendor"),
                "version" = COALESCE($3, "version"),
                "endpoint" = COALESCE($4, "endpoint"),
                "description" = COALESCE($5, "description"),
                "riskTier" = COALESCE($6::"AiToolRiskTier", "riskTier"),
                "isApproved" = CASE WHEN $6::"AiToolRiskTier" IS NOT NULL THEN $7 ELSE "isApproved" END,
                "approvedById" = CASE WHEN $6::"AiToolRiskTier" IS NOT NULL THEN $8 ELSE "approvedById" END,
                "approvedAt" = CASE
                    WHEN $6::"AiToolRiskTier" IS NOT NULL AND $7 = true THEN CURRENT_TIMESTAMP
                    WHEN $6::"AiToolRiskTier" IS NOT NULL AND $7 = false THEN NULL
                    ELSE "approvedAt"
                END,
                "decisionNotes" = CASE WHEN $6::"AiToolRiskTier" IS NOT NULL THEN $9 ELSE "decisionNotes" END,
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = $1
            RETURNING *
            """,
            tool_id,
            vendor,
            version,
            endpoint,
            description,
            risk_tier,
            is_approved,
            approved_by_id,
            decision_notes,
        )
    if row is None:
        return None
    async with pool.acquire() as conn:
        return await conn.fetchrow(f'{_LIST_SELECT} WHERE t."id" = $1', tool_id)


async def delete_ai_tool(pool: asyncpg.Pool, tool_id: str) -> bool:
    async with pool.acquire() as conn:
        result = await conn.execute('DELETE FROM "ai_tools" WHERE "id" = $1', tool_id)
        return result != "DELETE 0"
