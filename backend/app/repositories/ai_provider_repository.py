import uuid

import asyncpg

_LIST_SELECT = """
    SELECT p.*, COUNT(t."id") AS "toolCount"
    FROM "ai_providers" p
    LEFT JOIN "ai_tools" t ON t."providerId" = p."id"
"""


async def list_providers(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        return await conn.fetch(f'{_LIST_SELECT} GROUP BY p."id" ORDER BY p."vendor"')


async def get_provider_by_id(pool: asyncpg.Pool, provider_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(f'{_LIST_SELECT} WHERE p."id" = $1 GROUP BY p."id"', provider_id)


async def get_provider_by_vendor(pool: asyncpg.Pool, vendor: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow('SELECT * FROM "ai_providers" WHERE "vendor" = $1', vendor)


async def get_or_create_provider_by_vendor(pool: asyncpg.Pool, vendor: str) -> asyncpg.Record:
    """Ensures a vendor has a row to configure a key against — called the
    moment a vendor is first referenced (e.g. an admin links a tool to it),
    so it shows up in AI Provider Management as "Not Configured" rather than
    silently not existing at all."""
    async with pool.acquire() as conn:
        existing = await conn.fetchrow('SELECT * FROM "ai_providers" WHERE "vendor" = $1', vendor)
        if existing:
            return existing
        provider_id = str(uuid.uuid4())
        return await conn.fetchrow(
            'INSERT INTO "ai_providers" ("id", "vendor") VALUES ($1, $2) RETURNING *',
            provider_id,
            vendor,
        )


async def set_api_key(
    pool: asyncpg.Pool,
    provider_id: str,
    *,
    encrypted_api_key: str,
    key_last_four: str,
    api_base_url: str | None,
    configured_by_id: str,
) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        updated = await conn.fetchrow(
            """
            UPDATE "ai_providers" SET
                "encryptedApiKey" = $2,
                "keyLastFour" = $3,
                "apiBaseUrl" = COALESCE($4, "apiBaseUrl"),
                "configuredById" = $5,
                "configuredAt" = CURRENT_TIMESTAMP
            WHERE "id" = $1
            RETURNING *
            """,
            provider_id,
            encrypted_api_key,
            key_last_four,
            api_base_url,
            configured_by_id,
        )
    if updated is None:
        return None
    return await get_provider_by_id(pool, provider_id)
