import uuid

import asyncpg


async def compute_usage_metrics(
    pool: asyncpg.Pool, tool_id: str, window_start, window_end
) -> asyncpg.Record:
    """Raw counts from real logged prompts — no AI judgment involved. This is
    what a drift alert is actually triggered by."""
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT
                COUNT(*) AS "promptCount",
                COUNT(*) FILTER (WHERE p."status" = 'BLOCKED') AS "blockedCount",
                COUNT(*) FILTER (WHERE p."containsSensitiveData" = true) AS "sensitiveCount"
            FROM "prompts" p
            JOIN "ai_sessions" s ON s."id" = p."sessionId"
            WHERE s."aiToolId" = $1 AND p."createdAt" >= $2 AND p."createdAt" < $3
            """,
            tool_id,
            window_start,
            window_end,
        )


async def list_blocked_prompt_samples(
    pool: asyncpg.Pool, tool_id: str, window_start, window_end, limit: int = 5
) -> list[asyncpg.Record]:
    """A sample of this tool's own blocked prompt transcripts within the
    window — real text, used as evidence for the AI-assisted qualitative
    summary rather than the tool's static vendor description."""
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT p."promptText", p."status"
            FROM "prompts" p
            JOIN "ai_sessions" s ON s."id" = p."sessionId"
            WHERE s."aiToolId" = $1 AND p."createdAt" >= $2 AND p."createdAt" < $3
                AND p."status" = 'BLOCKED'
            ORDER BY p."createdAt" DESC
            LIMIT $4
            """,
            tool_id,
            window_start,
            window_end,
            limit,
        )


async def get_latest_scan(pool: asyncpg.Pool, tool_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            'SELECT * FROM "ai_tool_usage_scans" WHERE "aiToolId" = $1 ORDER BY "scannedAt" DESC LIMIT 1',
            tool_id,
        )


async def list_scans_for_tool(pool: asyncpg.Pool, tool_id: str) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            'SELECT * FROM "ai_tool_usage_scans" WHERE "aiToolId" = $1 ORDER BY "scannedAt" DESC',
            tool_id,
        )


async def create_scan(
    pool: asyncpg.Pool,
    *,
    tool_id: str,
    window_start,
    window_end,
    prompt_count: int,
    block_rate: float,
    sensitive_data_match_rate: float,
    is_drift_flagged: bool,
    ai_summary: str | None,
    triggered_by: str,
    triggered_by_id: str | None,
) -> asyncpg.Record:
    scan_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "ai_tool_usage_scans" (
                "id", "aiToolId", "windowStart", "windowEnd", "promptCount",
                "blockRate", "sensitiveDataMatchRate", "isDriftFlagged", "aiSummary",
                "triggeredBy", "triggeredById"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::"ScanTrigger", $11)
            RETURNING *
            """,
            scan_id,
            tool_id,
            window_start,
            window_end,
            prompt_count,
            block_rate,
            sensitive_data_match_rate,
            is_drift_flagged,
            ai_summary,
            triggered_by,
            triggered_by_id,
        )
