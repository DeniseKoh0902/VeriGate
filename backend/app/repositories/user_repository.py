import uuid

import asyncpg


async def get_user_by_email(pool: asyncpg.Pool, email: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT "id", "email", "passwordHash", "name", "department", "role"
            FROM "users"
            WHERE "email" = $1
            """,
            email,
        )


async def get_or_create_system_user(pool: asyncpg.Pool) -> str:
    """Returns the id of a placeholder admin user to attribute writes to,
    until real authentication issues a session for the logged-in admin."""
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            'SELECT "id" FROM "users" WHERE "email" = $1',
            "system@verigate.local",
        )
        if existing:
            return existing["id"]

        new_id = str(uuid.uuid4())
        await conn.execute(
            """
            INSERT INTO "users" ("id", "email", "passwordHash", "name", "department", "role", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, 'ADMIN', CURRENT_TIMESTAMP)
            """,
            new_id,
            "system@verigate.local",
            "unusable",
            "System",
            "IT Infrastructure",
        )
        return new_id
