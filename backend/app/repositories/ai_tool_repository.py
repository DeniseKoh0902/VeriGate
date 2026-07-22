import uuid

import asyncpg

_LIST_SELECT = """
    SELECT
        t.*, e."overallScore", r."earliestSlaDeadline",
        p."vendor" AS "providerVendor",
        (p."encryptedApiKey" IS NOT NULL) AS "providerHasApiKey"
    FROM "ai_tools" t
    LEFT JOIN LATERAL (
        SELECT "overallScore" FROM "ai_trust_evaluations" ev
        WHERE ev."aiToolId" = t."id"
        ORDER BY ev."evaluatedAt" DESC
        LIMIT 1
    ) e ON true
    LEFT JOIN LATERAL (
        -- Matched by name, not FK — a pending request has no approvedToolId
        -- yet. Surfaces how long the oldest waiting requester has been
        -- waiting on this Pending Review tool.
        SELECT MIN("slaDeadline") AS "earliestSlaDeadline" FROM "ai_tool_requests" req
        WHERE req."toolName" = t."name" AND req."status" = 'PENDING'
    ) r ON true
    LEFT JOIN "ai_providers" p ON p."id" = t."providerId"
"""


async def get_or_create_ai_tool_by_name(pool: asyncpg.Pool, name: str) -> asyncpg.Record:
    """Looks up an AiTool by display name, creating a placeholder row if it
    doesn't exist yet — lets AI Workspace reference a model name that hasn't
    been formally registered through AI Tool Management. The lookup goes
    through _LIST_SELECT (not a bare SELECT *) so prompt_service's provider-
    readiness check has "providerHasApiKey" to read off the returned row.

    vendor defaults to the tool name itself, not a literal "Unknown" — a
    generic placeholder string would silently match prompt_service's
    fallback-vendor allowance and route straight to Gemini with no admin
    ever having looked at it. Defaulting to the name means a brand-new,
    employee-typed tool is its own distinct (non-fallback) vendor until an
    admin either reclassifies it to a real vendor or explicitly sets it to
    Google/Gemini — "not configured yet" is the correct default, not a free
    pass."""
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(f'{_LIST_SELECT} WHERE t."name" = $1', name)
        if existing:
            return existing

        tool_id = str(uuid.uuid4())
        row = await conn.fetchrow(
            """
            INSERT INTO "ai_tools" ("id", "name", "vendor", "isApproved", "updatedAt")
            VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)
            RETURNING *
            """,
            tool_id,
            name,
            name,
        )
    return {
        **dict(row),
        "overallScore": None,
        "earliestSlaDeadline": None,
        "providerVendor": None,
        "providerHasApiKey": False,
    }


async def get_ai_tool_by_name(pool: asyncpg.Pool, name: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(f'{_LIST_SELECT} WHERE t."name" = $1', name)


async def create_pending_ai_tool_by_name(pool: asyncpg.Pool, name: str) -> asyncpg.Record:
    """Creates a Pending Review placeholder AiTool row for a name that isn't
    registered yet — used when an employee's AI Tool Request references a
    tool nobody has registered, so it shows up in AI Tool Management for an
    admin to evaluate. Unlike get_or_create_ai_tool_by_name (AI Workspace's
    auto-approving lookup), this deliberately leaves riskTier/isApproved at
    their unapproved defaults — a request must never silently grant access.

    vendor defaults to the tool name itself — see get_or_create_ai_tool_by_name
    for why a literal "Unknown" would be the wrong default here too."""
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
            name,
        )
    return {
        **dict(row),
        "overallScore": None,
        "earliestSlaDeadline": None,
        "providerVendor": None,
        "providerHasApiKey": False,
    }


async def list_ai_tools(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    """Overdue Pending Review tools first (most overdue first), then
    Pending Review tools still within SLA (soonest due first), then
    everything else newest-first — an overdue badge is useless if the row
    it's on can still get buried three pages down."""
    async with pool.acquire() as conn:
        return await conn.fetch(
            f"""{_LIST_SELECT}
            ORDER BY
                CASE
                    WHEN t."riskTier" = 'RESTRICTED' AND r."earliestSlaDeadline" < CURRENT_TIMESTAMP THEN 0
                    WHEN t."riskTier" = 'RESTRICTED' AND r."earliestSlaDeadline" IS NOT NULL THEN 1
                    ELSE 2
                END,
                r."earliestSlaDeadline" ASC NULLS LAST,
                t."createdAt" DESC
            """
        )


async def list_approved_tools(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    """Tools currently APPROVED for use — the only ones AI Workspace should
    let an employee pick from, kept in sync with AI Tool Management's status
    column instead of a static frontend list."""
    async with pool.acquire() as conn:
        return await conn.fetch(
            f'{_LIST_SELECT} WHERE t."riskTier" = \'APPROVED\' '
            'ORDER BY e."overallScore" DESC NULLS LAST, t."name"'
        )


async def list_selectable_tools(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    """Tools AI Workspace should let an employee pick from: every APPROVED
    tool, plus RESTRICTED (Pending Review) tools that have at least one
    active Tool Tier Policy opting them in for some category — otherwise a
    RESTRICTED tool with zero policies is still a dead end (every prompt to
    it gets BLOCKed by prompt_service's default-deny), so there's no point
    surfacing it as selectable. APPROVED tools sort first so "recommended"
    (index 0) never lands on a merely-partially-usable RESTRICTED tool."""
    async with pool.acquire() as conn:
        return await conn.fetch(
            f"""{_LIST_SELECT}
            WHERE t."riskTier" = 'APPROVED'
               OR (
                 t."riskTier" = 'RESTRICTED'
                 AND EXISTS (
                   SELECT 1 FROM "tool_tier_policies" p
                   WHERE p."isActive" = true
                     AND (p."aiToolId" = t."id" OR (p."aiToolId" IS NULL AND p."toolTier" = 'RESTRICTED'))
                 )
               )
            ORDER BY (t."riskTier" = 'APPROVED') DESC, e."overallScore" DESC NULLS LAST, t."name"
            """
        )


async def get_ai_tool(pool: asyncpg.Pool, tool_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(f'{_LIST_SELECT} WHERE t."id" = $1', tool_id)


async def get_ai_tool_for_prompt(pool: asyncpg.Pool, prompt_id: str) -> asyncpg.Record | None:
    """The tool a given prompt was submitted through, via prompts -> ai_sessions
    -> ai_tools — used when re-generating a response outside submit_prompt's
    own flow (e.g. an overturned appeal), where generate_ai_response still
    needs vendor/provider info to dispatch to the right model."""
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            f"""{_LIST_SELECT}
            WHERE t."id" = (
                SELECT s."aiToolId" FROM "prompts" p
                JOIN "ai_sessions" s ON s."id" = p."sessionId"
                WHERE p."id" = $1
            )
            """,
            prompt_id,
        )


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
    return {
        **dict(row),
        "overallScore": None,
        "earliestSlaDeadline": None,
        "providerVendor": None,
        "providerHasApiKey": False,
    }


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
    provider_id: str | None = None,
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
                "providerId" = COALESCE($10, "providerId"),
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
            provider_id,
        )
    if row is None:
        return None
    async with pool.acquire() as conn:
        return await conn.fetchrow(f'{_LIST_SELECT} WHERE t."id" = $1', tool_id)


async def delete_ai_tool(pool: asyncpg.Pool, tool_id: str) -> bool:
    async with pool.acquire() as conn:
        result = await conn.execute('DELETE FROM "ai_tools" WHERE "id" = $1', tool_id)
        return result != "DELETE 0"
