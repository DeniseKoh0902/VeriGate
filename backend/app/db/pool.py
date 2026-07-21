import asyncpg

from app.core.config import get_settings

_pool: asyncpg.Pool | None = None


async def connect_pool() -> None:
    global _pool
    if _pool is None:
        settings = get_settings()
        # Use Supabase pooled DATABASE_URL for Render runtime.
        # The Supabase pooler endpoint is designed for hosted environments
        # and avoids direct database connectivity issues.
        _pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            statement_cache_size=0,
            min_size=1,
            max_size=10,
            ssl="require",
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
