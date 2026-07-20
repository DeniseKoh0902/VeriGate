import logging
from contextlib import asynccontextmanager

import truststore

# Injected before any other imports: this machine's network fails standard
# certificate verification (the bundled certifi CA list doesn't cover
# whatever's actually needed here) for any outbound HTTPS call — the same
# class of issue fixed for git via the schannel backend. This makes Python's
# ssl module verify against Windows' native certificate store instead.
truststore.inject_into_ssl()

from apscheduler.schedulers.asyncio import AsyncIOScheduler  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from app.api.v1.router import api_router  # noqa: E402
from app.core.config import get_settings
from app.db.pool import connect_pool, disconnect_pool
from app.services import bias_drift_service

logging.basicConfig(level=logging.INFO)

settings = get_settings()
logger = logging.getLogger(__name__)


async def _run_scheduled_usage_scans() -> None:
    try:
        results = await bias_drift_service.run_scan_for_all_approved_tools(triggered_by="SCHEDULED")
        flagged = sum(1 for r in results if r.isDriftFlagged)
        logger.info("Scheduled usage scan: %d tool(s) scanned, %d flagged.", len(results), flagged)
    except Exception:
        logger.exception("Scheduled usage scan failed.")


async def _run_scheduled_reevaluation() -> None:
    try:
        results = await bias_drift_service.reevaluate_all_approved_tools_scheduled()
        logger.info("Scheduled re-evaluation: %d tool(s) re-scored.", len(results))
    except Exception:
        logger.exception("Scheduled re-evaluation failed.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_pool()
    scheduler = AsyncIOScheduler()
    # Weekly, not daily — at this usage volume, daily snapshots would mostly
    # be noise. A fixed cron schedule (vs. an interval trigger) also means a
    # server restart never pushes the next run out — it always aims for the
    # next Monday 8am MYT, not "7 days after whenever the process last
    # started."
    scheduler.add_job(
        _run_scheduled_usage_scans,
        "cron",
        day_of_week="mon",
        hour=8,
        minute=0,
        timezone="Asia/Kuala_Lumpur",
        id="weekly_usage_scan",
    )
    # 30 minutes after the usage scan above, not the same minute — keeps the
    # two independent jobs from firing simultaneously and competing for
    # Gemini calls, even though neither actually depends on the other's
    # output (each computes its own usage evidence straight from prompts).
    scheduler.add_job(
        _run_scheduled_reevaluation,
        "cron",
        day_of_week="mon",
        hour=8,
        minute=30,
        timezone="Asia/Kuala_Lumpur",
        id="weekly_trust_score_reevaluation",
    )
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)
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
