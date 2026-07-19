from app.db.pool import get_pool
from app.repositories import dashboard_repository
from app.schemas.dashboard import (
    AiToolStatusOut,
    ComplianceScoreOut,
    DashboardAlertOut,
    DashboardOverviewOut,
    RiskDistributionSegmentOut,
    StatTileOut,
    TrustScoreSummaryOut,
)

_TREND_DAYS = 7
# Kept small on purpose — this is a "recent activity at a glance" widget, not
# the full alert list (that's what Risk Alert Center is for). The severity/
# status filter on this card just narrows within these 5, same as everywhere
# else in the app that filters an already-fetched page of rows.
_RECENT_ALERTS_LIMIT = 5
_DISTRIBUTION_LOOKBACK_DAYS = 30
_DISTRIBUTION_TOP_N = 3
_TRUST_SCORE_LIMIT = 3
_RECENT_TOOLS_LIMIT = 4


def _format_count(value: int) -> str:
    if value >= 1000:
        return f"{value / 1000:.1f}k"
    return str(value)


def _safe_pct(numerator: int, denominator: int) -> float:
    """No prompts submitted that day/period is treated as fully compliant
    (nothing violated a policy), not as 0% — 0% would misleadingly read as
    "everything got blocked" when really nothing happened at all."""
    if denominator == 0:
        return 100.0
    return round(numerator / denominator * 100, 1)


async def get_overview() -> DashboardOverviewOut:
    pool = get_pool()

    daily = await dashboard_repository.get_daily_prompt_stats(pool, days=_TREND_DAYS)
    alert_rows = await dashboard_repository.list_recent_alerts(pool, limit=_RECENT_ALERTS_LIMIT)
    distribution_rows = await dashboard_repository.get_risk_distribution_by_tool(
        pool, days=_DISTRIBUTION_LOOKBACK_DAYS
    )
    compliance_row = await dashboard_repository.get_compliance_score(pool)
    trust_rows = await dashboard_repository.get_top_trust_scores(pool, limit=_TRUST_SCORE_LIMIT)
    tool_rows = await dashboard_repository.list_recent_ai_tools(pool, limit=_RECENT_TOOLS_LIMIT)

    total_trend = [float(row["total"]) for row in daily]
    blocked_trend = [float(row["blocked"]) for row in daily]
    latency_trend = [round(float(row["avgLatency"])) for row in daily]
    compliance_trend = [
        _safe_pct(row["total"] - row["blocked"], row["total"]) for row in daily
    ]

    stat_tiles = [
        StatTileOut(
            label="Prompt Volume",
            value=_format_count(int(total_trend[-1])),
            unit="prompts / day",
            trend=total_trend,
        ),
        StatTileOut(
            label="AI Response Time",
            value=str(latency_trend[-1]),
            unit="avg ms latency",
            trend=[float(v) for v in latency_trend],
        ),
        StatTileOut(
            label="Compliance Rate",
            value=f"{compliance_trend[-1]}%",
            unit="prompts allowed",
            trend=compliance_trend,
        ),
        StatTileOut(
            label="Policy Enforcement",
            value=_format_count(int(blocked_trend[-1])),
            unit="blocks / day",
            trend=blocked_trend,
        ),
    ]

    recent_alerts = [DashboardAlertOut(**dict(row)) for row in alert_rows]

    distribution: list[RiskDistributionSegmentOut] = []
    other_total = 0
    for index, row in enumerate(distribution_rows):
        if index < _DISTRIBUTION_TOP_N:
            distribution.append(RiskDistributionSegmentOut(label=row["label"], value=row["value"]))
        else:
            other_total += row["value"]
    if other_total > 0:
        distribution.append(RiskDistributionSegmentOut(label="Other", value=other_total))

    compliance_score = ComplianceScoreOut(
        todayPct=_safe_pct(compliance_row["todayOk"], compliance_row["todayTotal"]),
        deltaVsYesterday=round(
            _safe_pct(compliance_row["todayOk"], compliance_row["todayTotal"])
            - _safe_pct(compliance_row["yesterdayOk"], compliance_row["yesterdayTotal"]),
            1,
        ),
    )

    trust_scores = [TrustScoreSummaryOut(**dict(row)) for row in trust_rows]
    recent_ai_tools = [AiToolStatusOut(**dict(row)) for row in tool_rows]

    return DashboardOverviewOut(
        statTiles=stat_tiles,
        recentAlerts=recent_alerts,
        riskDistribution=distribution,
        complianceScore=compliance_score,
        trustScores=trust_scores,
        recentAiTools=recent_ai_tools,
    )
