import asyncpg

from app.core.config import get_settings

_pool: asyncpg.Pool | None = None


async def connect_pool() -> None:
    global _pool
    if _pool is None:
        settings = get_settings()
        # Using DIRECT_URL rather than the pooled DATABASE_URL: this project's
        # Supavisor pooler currently rejects the pooled connection string
        # ("tenant/user not found") even though the credentials are valid — the
        # direct connection works fine and is adequate for a single backend
        # instance. Revisit DATABASE_URL if this needs to scale to more
        # concurrent connections than Postgres's direct connection limit allows.
        _pool = await asyncpg.create_pool(
            dsn=settings.direct_url,
            statement_cache_size=0,
            min_size=1,
            max_size=10,
        )


async def disconnect_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not connected yet.")
    return _pool
