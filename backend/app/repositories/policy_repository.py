import uuid

import asyncpg


async def list_policies(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch('SELECT * FROM "policies" ORDER BY "createdAt" DESC')


async def get_policy_by_id(pool: asyncpg.Pool, policy_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow('SELECT * FROM "policies" WHERE "id" = $1', policy_id)


async def create_policy(
    pool: asyncpg.Pool,
    *,
    name: str,
    description: str | None,
    severity: str,
    applies_to_department: str | None,
    created_by_id: str,
) -> asyncpg.Record:
    policy_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "policies"
                ("id", "name", "description", "severity", "appliesToDepartment", "createdById")
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            """,
            policy_id,
            name,
            description,
            severity,
            applies_to_department,
            created_by_id,
        )


async def update_policy(
    pool: asyncpg.Pool,
    policy_id: str,
    *,
    name: str | None = None,
    description: str | None = None,
    severity: str | None = None,
    applies_to_department: str | None = None,
    is_active: bool | None = None,
) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            UPDATE "policies" SET
                "name" = COALESCE($2, "name"),
                "description" = COALESCE($3, "description"),
                "severity" = COALESCE($4, "severity"),
                "appliesToDepartment" = COALESCE($5, "appliesToDepartment"),
                "isActive" = COALESCE($6, "isActive")
            WHERE "id" = $1
            RETURNING *
            """,
            policy_id,
            name,
            description,
            severity,
            applies_to_department,
            is_active,
        )


async def delete_policy(pool: asyncpg.Pool, policy_id: str) -> bool:
    async with pool.acquire() as conn:
        result = await conn.execute('DELETE FROM "policies" WHERE "id" = $1', policy_id)
        return result != "DELETE 0"
