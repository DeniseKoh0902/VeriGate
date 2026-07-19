import logging
from datetime import datetime, timedelta

from google.genai import errors, types

from app.core.gemini_client import get_gemini_client
from app.db.pool import get_pool
from app.repositories import (
    ai_tool_repository,
    ai_tool_usage_scan_repository,
    ai_trust_evaluation_repository,
    user_repository,
)
from app.schemas.ai_tool import AiTrustEvaluationOut
from app.schemas.bias_drift import AiToolUsageScanOut
from app.services import ai_tool_service
from app.services.ai_tool_decision_notifier import (
    notify_governance_drift_flagged,
    notify_governance_trust_score_regressed,
)

logger = logging.getLogger(__name__)

_WINDOW_DAYS = 7
# How much a rate has to jump versus the tool's previous scan to count as
# drift, rather than ordinary week-to-week noise.
_DRIFT_DELTA_THRESHOLD = 0.15
# Used only when there's no previous scan to compare against — flags a
# tool's very first scan if its absolute rate is already high.
_MIN_ABSOLUTE_BLOCK_RATE = 0.10
# A tool's trust score has to fall below its previous evaluation AND below
# this to count as a regression worth alerting — a tool that's always
# scored 65 isn't regressing, one that dropped from 85 to 65 is.
_TRUST_SCORE_THRESHOLD = 70
# Attributed as the evaluator on scheduled re-evaluations — there's no human
# admin to credit when this runs unattended off the weekly cron.
_SYSTEM_ACTOR_EMAIL = "system@verigate.local"

_SUMMARY_MODEL = "gemini-flash-lite-latest"
_SUMMARY_SYSTEM_INSTRUCTION = (
    "You are reviewing real blocked-prompt transcripts for an AI tool inside "
    "VeriGate, an enterprise AI governance gateway, to help a human reviewer "
    "understand what's driving a flagged usage pattern. Given the transcripts "
    "below, write a 2-3 sentence neutral summary of what you actually observe — "
    "repeated topics, sensitive-data categories, or anything resembling biased "
    "or discriminatory intent. Do not speculate beyond what's in the text. If "
    "nothing notable stands out beyond routine policy triggers, say so plainly."
)


def _rate(count: int, total: int) -> float:
    return count / total if total else 0.0


async def _compute_usage_evidence(pool, tool_id: str):
    """Shared by the background drift scan and the manual re-evaluation flow
    — both need the same real, zero-AI numbers as their starting point."""
    window_end = datetime.utcnow()
    window_start = window_end - timedelta(days=_WINDOW_DAYS)
    metrics = await ai_tool_usage_scan_repository.compute_usage_metrics(
        pool, tool_id, window_start, window_end
    )
    prompt_count = metrics["promptCount"]
    block_rate = _rate(metrics["blockedCount"], prompt_count)
    sensitive_rate = _rate(metrics["sensitiveCount"], prompt_count)
    return window_start, window_end, prompt_count, block_rate, sensitive_rate


async def _summarize_flagged_prompts(pool, tool_id: str, window_start, window_end) -> str | None:
    samples = await ai_tool_usage_scan_repository.list_blocked_prompt_samples(
        pool, tool_id, window_start, window_end
    )
    if not samples:
        return None

    transcript = "\n\n".join(
        f"Blocked prompt {i + 1}: {s['promptText']}" for i, s in enumerate(samples)
    )
    try:
        client = get_gemini_client()
        response = await client.aio.models.generate_content(
            model=_SUMMARY_MODEL,
            contents=transcript,
            config=types.GenerateContentConfig(system_instruction=_SUMMARY_SYSTEM_INSTRUCTION),
        )
        return response.text
    except errors.APIError as error:
        logger.error("Gemini API error during drift summary (code=%s): %s", error.code, error.message)
        return None


async def run_scan(
    tool_id: str, *, triggered_by: str, actor_id: str | None = None
) -> AiToolUsageScanOut:
    pool = get_pool()
    tool = await ai_tool_repository.get_ai_tool(pool, tool_id)
    if tool is None:
        raise ValueError(f"AI tool {tool_id} not found.")

    window_start, window_end, prompt_count, block_rate, sensitive_rate = (
        await _compute_usage_evidence(pool, tool_id)
    )

    previous = await ai_tool_usage_scan_repository.get_latest_scan(pool, tool_id)

    is_flagged = False
    if prompt_count > 0:
        if previous is not None:
            is_flagged = (
                block_rate - previous["blockRate"] >= _DRIFT_DELTA_THRESHOLD
                or sensitive_rate - previous["sensitiveDataMatchRate"] >= _DRIFT_DELTA_THRESHOLD
            )
        else:
            is_flagged = block_rate >= _MIN_ABSOLUTE_BLOCK_RATE

    ai_summary = None
    if is_flagged:
        ai_summary = await _summarize_flagged_prompts(pool, tool_id, window_start, window_end)

    scan_row = await ai_tool_usage_scan_repository.create_scan(
        pool,
        tool_id=tool_id,
        window_start=window_start,
        window_end=window_end,
        prompt_count=prompt_count,
        block_rate=block_rate,
        sensitive_data_match_rate=sensitive_rate,
        is_drift_flagged=is_flagged,
        ai_summary=ai_summary,
        triggered_by=triggered_by,
        triggered_by_id=actor_id,
    )

    if is_flagged:
        await notify_governance_drift_flagged(
            pool,
            scan_id=scan_row["id"],
            tool_name=tool["name"],
            block_rate=block_rate,
            sensitive_data_match_rate=sensitive_rate,
        )

    return AiToolUsageScanOut(**dict(scan_row))


async def run_scan_for_all_approved_tools(
    *, triggered_by: str, actor_id: str | None = None
) -> list[AiToolUsageScanOut]:
    pool = get_pool()
    tools = await ai_tool_repository.list_approved_tools(pool)
    return [
        await run_scan(tool["id"], triggered_by=triggered_by, actor_id=actor_id) for tool in tools
    ]


async def list_scans_for_tool(tool_id: str) -> list[AiToolUsageScanOut]:
    pool = get_pool()
    rows = await ai_tool_usage_scan_repository.list_scans_for_tool(pool, tool_id)
    return [AiToolUsageScanOut(**dict(row)) for row in rows]


async def reevaluate_all_approved_tools(actor_id: str) -> list[AiTrustEvaluationOut]:
    """The manual "Re-evaluate All" action — re-scores every APPROVED tool
    that had real usage in the last 7 days, grounded in that tool's own
    measured block rate / sensitive-data rate / blocked-prompt transcripts
    rather than a re-guess of its static description. Tools with zero usage
    this period are skipped — there's no new evidence to re-derive a score
    from. Notifies governance if a tool's score both dropped from its
    previous evaluation AND fell below the approval threshold."""
    pool = get_pool()
    tools = await ai_tool_repository.list_approved_tools(pool)
    results: list[AiTrustEvaluationOut] = []

    for tool in tools:
        window_start, window_end, prompt_count, block_rate, sensitive_rate = (
            await _compute_usage_evidence(pool, tool["id"])
        )
        if prompt_count == 0:
            continue

        samples = await ai_tool_usage_scan_repository.list_blocked_prompt_samples(
            pool, tool["id"], window_start, window_end
        )
        previous = await ai_trust_evaluation_repository.get_latest_trust_evaluation(
            pool, tool["id"]
        )

        new_eval = await ai_tool_service.reevaluate_tool_from_usage(
            tool["id"],
            block_rate=block_rate,
            sensitive_data_match_rate=sensitive_rate,
            blocked_prompt_samples=[s["promptText"] for s in samples],
            actor_id=actor_id,
        )
        if new_eval is None:
            continue
        results.append(new_eval)

        if (
            previous is not None
            and new_eval.overallScore < previous["overallScore"]
            and new_eval.overallScore < _TRUST_SCORE_THRESHOLD
        ):
            await notify_governance_trust_score_regressed(
                pool,
                tool_id=tool["id"],
                tool_name=tool["name"],
                current_score=new_eval.overallScore,
                previous_score=previous["overallScore"],
                threshold=_TRUST_SCORE_THRESHOLD,
            )

    return results


async def reevaluate_all_approved_tools_scheduled() -> list[AiTrustEvaluationOut]:
    """Entry point for the weekly cron job — resolves the system actor
    account itself so main.py doesn't need direct pool/user-repository
    access just to attribute an unattended run."""
    pool = get_pool()
    system_user = await user_repository.get_user_by_email(pool, _SYSTEM_ACTOR_EMAIL)
    if system_user is None:
        logger.error(
            "Scheduled re-evaluation skipped: system actor account (%s) not found.",
            _SYSTEM_ACTOR_EMAIL,
        )
        return []
    return await reevaluate_all_approved_tools(system_user["id"])
