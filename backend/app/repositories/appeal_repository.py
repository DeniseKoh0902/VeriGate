import uuid

import asyncpg

_SOURCE_OWNERSHIP_QUERIES = {
    "PROMPT_BLOCK": """
        SELECT p."id" FROM "prompts" p
        JOIN "ai_sessions" s ON s."id" = p."sessionId"
        WHERE p."id" = $1 AND s."userId" = $2 AND p."status" = 'BLOCKED'
    """,
    "TOOL_REJECTION": """
        SELECT "id" FROM "ai_tool_requests"
        WHERE "id" = $1 AND "userId" = $2 AND "status" = 'REJECTED'
    """,
    "RISK_ALERT": """
        SELECT "id" FROM "risk_alerts" WHERE "id" = $1 AND "userId" = $2
    """,
}


async def source_belongs_to_user(
    pool: asyncpg.Pool, *, source_type: str, source_id: str, user_id: str
) -> bool:
    query = _SOURCE_OWNERSHIP_QUERIES[source_type]
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, source_id, user_id)
        return row is not None


async def list_appeals_by_user(pool: asyncpg.Pool, user_id: str) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            'SELECT * FROM "appeals" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
            user_id,
        )


async def get_appeal_by_source(
    pool: asyncpg.Pool, *, user_id: str, source_type: str, source_id: str
) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT * FROM "appeals"
            WHERE "userId" = $1 AND "sourceType" = $2::"AppealSourceType" AND "sourceId" = $3
            """,
            user_id,
            source_type,
            source_id,
        )


async def list_all_appeals(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT a.*, u."name" AS "employeeName", u."email" AS "employeeEmail"
            FROM "appeals" a
            JOIN "users" u ON u."id" = a."userId"
            ORDER BY a."createdAt" DESC
            """
        )


async def resolve_appeal(
    pool: asyncpg.Pool,
    appeal_id: str,
    *,
    resolution: str,
    resolution_notes: str | None,
    reviewed_by_id: str,
) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        updated = await conn.fetchrow(
            """
            UPDATE "appeals" SET
                "status" = 'RESOLVED',
                "resolution" = $2::"AppealResolution",
                "resolutionNotes" = $3,
                "reviewedById" = $4,
                "resolvedAt" = CURRENT_TIMESTAMP
            WHERE "id" = $1
            RETURNING "id"
            """,
            appeal_id,
            resolution,
            resolution_notes,
            reviewed_by_id,
        )
        if updated is None:
            return None

        return await conn.fetchrow(
            """
            SELECT a.*, u."name" AS "employeeName", u."email" AS "employeeEmail"
            FROM "appeals" a
            JOIN "users" u ON u."id" = a."userId"
            WHERE a."id" = $1
            """,
            appeal_id,
        )


async def request_more_info(
    pool: asyncpg.Pool,
    appeal_id: str,
    *,
    message: str,
    requested_by_id: str,
) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        updated = await conn.fetchrow(
            """
            UPDATE "appeals" SET
                "status" = 'AWAITING_INFO',
                "additionalInfoRequest" = $2,
                "employeeResponse" = NULL,
                "reviewedById" = $3
            WHERE "id" = $1 AND "status" != 'RESOLVED'
            RETURNING "id", "userId"
            """,
            appeal_id,
            message,
            requested_by_id,
        )
        if updated is None:
            return None

        return await conn.fetchrow(
            """
            SELECT a.*, u."name" AS "employeeName", u."email" AS "employeeEmail"
            FROM "appeals" a
            JOIN "users" u ON u."id" = a."userId"
            WHERE a."id" = $1
            """,
            appeal_id,
        )


async def respond_to_info_request(
    pool: asyncpg.Pool,
    appeal_id: str,
    *,
    user_id: str,
    response: str,
) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            UPDATE "appeals" SET
                "status" = 'UNDER_REVIEW',
                "employeeResponse" = $3
            WHERE "id" = $1 AND "userId" = $2 AND "status" = 'AWAITING_INFO'
            RETURNING *
            """,
            appeal_id,
            user_id,
            response,
        )


async def create_appeal(
    pool: asyncpg.Pool,
    *,
    user_id: str,
    source_type: str,
    source_id: str,
    justification: str,
    evidence_url: str | None,
) -> asyncpg.Record:
    appeal_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "appeals"
                ("id", "sourceType", "sourceId", "userId", "justification", "evidenceUrl", "slaDeadline")
            VALUES ($1, $2::"AppealSourceType", $3, $4, $5, $6, CURRENT_TIMESTAMP + INTERVAL '3 days')
            RETURNING *
            """,
            appeal_id,
            source_type,
            source_id,
            user_id,
            justification,
            evidence_url,
        )
