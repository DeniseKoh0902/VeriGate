import uuid

import asyncpg


async def get_user_by_email(pool: asyncpg.Pool, email: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT "id", "email", "passwordHash", "name", "department", "role", "isActive", "createdAt"
            FROM "users"
            WHERE "email" = $1
            """,
            email,
        )


async def get_user_by_id(pool: asyncpg.Pool, user_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            SELECT "id", "email", "passwordHash", "name", "department", "role", "isActive", "createdAt"
            FROM "users"
            WHERE "id" = $1
            """,
            user_id,
        )


async def list_admin_contacts(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT "name", "email" FROM "users"
            WHERE "role" = 'ADMIN' AND "isActive" = true
            ORDER BY "name"
            """
        )


async def list_governance_users(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    """Active ADMIN/COMPLIANCE users — the audience for anything that needs a
    governance reviewer's attention, e.g. a newly submitted AI tool request."""
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT "id", "name", "email" FROM "users"
            WHERE "role" IN ('ADMIN', 'COMPLIANCE') AND "isActive" = true
            """
        )


async def list_users(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(
            """
            SELECT "id", "email", "name", "department", "role", "isActive", "createdAt"
            FROM "users"
            ORDER BY "createdAt" DESC
            """
        )


async def create_user(
    pool: asyncpg.Pool,
    *,
    email: str,
    password_hash: str,
    name: str,
    department: str,
    role: str,
) -> asyncpg.Record:
    user_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "users"
                ("id", "email", "passwordHash", "name", "department", "role", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6::"Role", CURRENT_TIMESTAMP)
            RETURNING "id", "email", "name", "department", "role", "isActive", "createdAt"
            """,
            user_id,
            email,
            password_hash,
            name,
            department,
            role,
        )


async def update_user(
    pool: asyncpg.Pool,
    user_id: str,
    *,
    name: str | None = None,
    department: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            UPDATE "users" SET
                "name" = COALESCE($2, "name"),
                "department" = COALESCE($3, "department"),
                "role" = COALESCE($4::"Role", "role"),
                "isActive" = COALESCE($5, "isActive"),
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = $1
            RETURNING "id", "email", "name", "department", "role", "isActive", "createdAt"
            """,
            user_id,
            name,
            department,
            role,
            is_active,
        )


async def delete_user(pool: asyncpg.Pool, user_id: str) -> bool:
    async with pool.acquire() as conn:
        result = await conn.execute('DELETE FROM "users" WHERE "id" = $1', user_id)
        return result != "DELETE 0"


async def email_exists(pool: asyncpg.Pool, email: str) -> bool:
    async with pool.acquire() as conn:
        row = await conn.fetchrow('SELECT 1 FROM "users" WHERE "email" = $1', email)
        return row is not None


async def update_password(pool: asyncpg.Pool, user_id: str, password_hash: str) -> bool:
    async with pool.acquire() as conn:
        result = await conn.execute(
            """
            UPDATE "users" SET "passwordHash" = $2, "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = $1
            """,
            user_id,
            password_hash,
        )
        return result != "UPDATE 0"


