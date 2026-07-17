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


async def get_or_create_demo_employee(pool: asyncpg.Pool) -> str:
    """Returns the id of a placeholder employee to attribute AI Workspace
    activity to, until real authentication issues a session for the
    logged-in employee."""
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            'SELECT "id" FROM "users" WHERE "email" = $1',
            "demo.employee@verigate.local",
        )
        if existing:
            return existing["id"]

        new_id = str(uuid.uuid4())
        await conn.execute(
            """
            INSERT INTO "users" ("id", "email", "passwordHash", "name", "department", "role", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, 'EMPLOYEE', CURRENT_TIMESTAMP)
            """,
            new_id,
            "demo.employee@verigate.local",
            "unusable",
            "Demo Employee",
            "Finance",
        )
        return new_id
