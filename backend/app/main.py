from contextlib import asynccontextmanager

import truststore

# Injected before any other imports: this machine's network fails standard
# certificate verification (the bundled certifi CA list doesn't cover
# whatever's actually needed here) for any outbound HTTPS call — the same
# class of issue fixed for git via the schannel backend. This makes Python's
# ssl module verify against Windows' native certificate store instead.
truststore.inject_into_ssl()

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from app.api.v1.router import api_router  # noqa: E402
from app.core.config import get_settings
from app.db.pool import connect_pool, disconnect_pool

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_pool()
    yield
    await disconnect_pool()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
