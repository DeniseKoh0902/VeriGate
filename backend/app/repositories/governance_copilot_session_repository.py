import uuid

import asyncpg


async def create_session(pool: asyncpg.Pool, *, user_id: str) -> str:
    session_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        await conn.execute(
            'INSERT INTO "governance_copilot_sessions" ("id", "userId") VALUES ($1, $2)',
            session_id,
            user_id,
        )
    return session_id


async def get_session(pool: asyncpg.Pool, session_id: str, user_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            'SELECT "id" FROM "governance_copilot_sessions" WHERE "id" = $1 AND "userId" = $2',
            session_id,
            user_id,
        )


async def list_sessions_for_user(pool: asyncpg.Pool, user_id: str) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT s."id", s."startedAt" AS "createdAt",
                   first_m."text" AS "preview", last_m."createdAt" AS "lastMessageAt"
            FROM "governance_copilot_sessions" s
            JOIN LATERAL (
                SELECT "text" FROM "governance_copilot_messages"
                WHERE "sessionId" = s."id" ORDER BY "createdAt" ASC LIMIT 1
            ) first_m ON true
            JOIN LATERAL (
                SELECT "createdAt" FROM "governance_copilot_messages"
                WHERE "sessionId" = s."id" ORDER BY "createdAt" DESC LIMIT 1
            ) last_m ON true
            WHERE s."userId" = $1
            ORDER BY last_m."createdAt" DESC
            """,
            user_id,
        )


async def create_message(
    pool: asyncpg.Pool, *, session_id: str, role: str, text: str
) -> asyncpg.Record:
    message_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "governance_copilot_messages" ("id", "sessionId", "role", "text")
            VALUES ($1, $2, $3::"CopilotRole", $4)
            RETURNING *
            """,
            message_id,
            session_id,
            role,
            text,
        )


async def list_messages_for_session(pool: asyncpg.Pool, session_id: str) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT "role", "text", "createdAt" FROM "governance_copilot_messages"
            WHERE "sessionId" = $1
            ORDER BY "createdAt" ASC
            """,
            session_id,
        )
