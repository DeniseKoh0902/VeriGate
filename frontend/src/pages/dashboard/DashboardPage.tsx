import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, RefreshCw, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Sparkline } from '@/components/ui/Sparkline';
import { DonutChart } from '@/components/ui/DonutChart';
import * as dashboardService from '@/services/dashboard.service';
import type { DashboardOverview, StatTile } from '@/types/dashboard.types';

const severityBadge: Record<string, 'good' | 'warning' | 'serious' | 'critical'> = {
  LOW: 'good',
  MEDIUM: 'warning',
  HIGH: 'serious',
  CRITICAL: 'critical',
};

const alertStatusBadge: Record<string, 'good' | 'warning' | 'critical'> = {
  OPEN: 'critical',
  ESCALATED: 'warning',
  RESOLVED: 'good',
};

const riskTierLabel: Record<string, string> = {
  APPROVED: 'Approved',
  RESTRICTED: 'Restricted',
  BLOCKED: 'Blocked',
};

const distributionPalette = ['#e34948', '#2a78d6', '#d69e2a', '#0ca30c', '#8b5cf6', '#64748b'];

const severityFilterOptions = ['All', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const statusFilterOptions = ['All', 'OPEN', 'ESCALATED', 'RESOLVED'] as const;

// Whether a rising trend is good, bad, or neither for each tile — drives the
// delta indicator's color instead of a fixed "Healthy" badge that wasn't
// actually derived from the data.
const tileTrendSense: Record<string, 'up-good' | 'down-good' | 'neutral'> = {
  'Prompt Volume': 'neutral',
  'AI Response Time': 'down-good',
  'Compliance Rate': 'up-good',
  'Policy Enforcement': 'neutral',
};

function scoreColor(score: number) {
  if (score >= 95) return 'text-emerald-600';
  if (score >= 90) return 'text-blue-600';
  return 'text-orange-600';
}

function formatTimestamp(date: string) {
  return new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' });
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

function tileDelta(tile: StatTile): { label: string; tone: 'good' | 'bad' | 'neutral' } {
  if (tile.trend.length < 2) return { label: '—', tone: 'neutral' };
  const prev = tile.trend[tile.trend.length - 2];
  const curr = tile.trend[tile.trend.length - 1];
  if (prev === 0 && curr === 0) return { label: 'No change', tone: 'neutral' };

  const pct = prev === 0 ? 100 : ((curr - prev) / prev) * 100;
  if (Math.abs(pct) < 0.5) return { label: 'No change vs yesterday', tone: 'neutral' };

  const direction = pct > 0 ? 'up' : 'down';
  const sense = tileTrendSense[tile.label] ?? 'neutral';
  const tone: 'good' | 'bad' | 'neutral' =
    sense === 'neutral'
      ? 'neutral'
      : (sense === 'up-good') === (direction === 'up')
        ? 'good'
        : 'bad';

  return { label: `${direction === 'up' ? '▲' : '▼'} ${Math.abs(Math.round(pct))}% vs yesterday`, tone };
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setClock] = useState(0);
  const [isAlertFilterOpen, setIsAlertFilterOpen] = useState(false);
  const [alertSeverityFilter, setAlertSeverityFilter] =
    useState<(typeof severityFilterOptions)[number]>('All');
  const [alertStatusFilter, setAlertStatusFilter] =
    useState<(typeof statusFilterOptions)[number]>('All');

  const load = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      setData(await dashboardService.getDashboardOverview());
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the dashboard.');
    } finally {
      if (isManualRefresh) setIsRefreshing(false);
      else setIsLoading(false);
    }
  };

  // Silent background refetch — no loading spinner, no error banner (a
  // transient failed poll shouldn't disrupt an otherwise-fine dashboard).
  // This is what makes "Recently Added AI Tools" and everything else on
  // this page actually live, not just "correct as of whenever you last hit
  // Refresh."
  const pollSilently = async () => {
    try {
      setData(await dashboardService.getDashboardOverview());
      setLastUpdated(new Date());
    } catch {
      // Swallowed — the next poll (or the visible Refresh button) will
      // recover; surfacing a transient network blip here would just be
      // noisy for something that self-heals.
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(pollSilently, 15_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-renders once a second purely so the "Updated Xs ago" label stays
  // current — no network activity involved.
  useEffect(() => {
    const interval = setInterval(() => setClock((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredAlerts = useMemo(() => {
    return (data?.recentAlerts ?? []).filter((alert) => {
      if (alertSeverityFilter !== 'All' && alert.severity !== alertSeverityFilter) return false;
      if (alertStatusFilter !== 'All' && alert.status !== alertStatusFilter) return false;
      return true;
    });
  }, [data?.recentAlerts, alertSeverityFilter, alertStatusFilter]);

  const distributionSegments = useMemo(
    () =>
      (data?.riskDistribution ?? []).map((segment, index) => ({
        label: segment.label,
        value: segment.value,
        color: distributionPalette[index % distributionPalette.length],
      })),
    [data?.riskDistribution],
  );

  const maxDepartmentPrompts = useMemo(
    () => Math.max(1, ...(data?.usageByDepartment ?? []).map((d) => d.promptCount)),
    [data?.usageByDepartment],
  );

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Control Plane Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Governance health and AI usage telemetry across all integrated AI tools.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400">Updated {formatRelativeTime(lastUpdated)}</span>
          )}
          <Button
            variant="secondary"
            className="w-auto"
            onClick={() => load(true)}
            isLoading={isRefreshing}
          >
            <RefreshCw size={15} />
            Refresh
          </Button>
          <Link to="/help-center" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Help Center
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading && !data ? (
        <Card className="p-8 text-center text-sm text-slate-400">Loading dashboard…</Card>
      ) : (
        data && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {data.statTiles.map((tile) => {
                const delta = tileDelta(tile);
                return (
                  <Card key={tile.label} className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {tile.label}
                      </span>
                      <span
                        className={
                          delta.tone === 'good'
                            ? 'text-xs font-medium text-emerald-600'
                            : delta.tone === 'bad'
                              ? 'text-xs font-medium text-red-600'
                              : 'text-xs font-medium text-slate-400'
                        }
                      >
                        {delta.label}
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900">{tile.value}</p>
                    <p className="text-xs text-slate-400">{tile.unit}</p>
                    <Sparkline data={tile.trend} color="#2a78d6" className="mt-2 h-7 w-full" />
                  </Card>
                );
              })}
            </div>

            <Card className="mt-6">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">AI Usage by Department</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Prompt volume, block rate, and tool adoption by department over the last 30 days.
                </p>
              </div>
              {(data.usageByDepartment ?? []).length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-400">
                  No AI usage recorded in the last 30 days.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                        <th className="px-5 py-2 font-medium">Department</th>
                        <th className="px-5 py-2 font-medium">Prompt Volume</th>
                        <th className="px-5 py-2 font-medium">Block Rate</th>
                        <th className="px-5 py-2 font-medium">Active Users</th>
                        <th className="px-5 py-2 font-medium">Top Tool</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.usageByDepartment.map((dept) => (
                        <tr key={dept.department} className="border-t border-slate-100">
                          <td className="px-5 py-3 font-medium text-slate-900">{dept.department}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-blue-500"
                                  style={{
                                    width: `${(dept.promptCount / maxDepartmentPrompts) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-slate-500">{dept.promptCount}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <Badge status={dept.blockRatePct >= 10 ? 'serious' : 'good'}>
                              {dept.blockRatePct}%
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-slate-500">{dept.activeUsers}</td>
                          <td className="px-5 py-3 text-slate-500">{dept.topTool ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <Card>
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h2 className="font-semibold text-slate-900">Real-Time Risk Alert Feed</h2>
                    <button
                      type="button"
                      aria-label="Toggle filters"
                      onClick={() => setIsAlertFilterOpen((prev) => !prev)}
                      className={
                        isAlertFilterOpen
                          ? 'text-blue-600'
                          : 'text-slate-400 hover:text-slate-600'
                      }
                    >
                      <Filter size={16} />
                    </button>
                  </div>

                  {isAlertFilterOpen && (
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
                      <select
                        value={alertSeverityFilter}
                        onChange={(e) =>
                          setAlertSeverityFilter(
                            e.target.value as (typeof severityFilterOptions)[number],
                          )
                        }
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
                      >
                        {severityFilterOptions.map((option) => (
                          <option key={option} value={option}>
                            {option === 'All' ? 'All Severities' : option}
                          </option>
                        ))}
                      </select>
                      <select
                        value={alertStatusFilter}
                        onChange={(e) =>
                          setAlertStatusFilter(
                            e.target.value as (typeof statusFilterOptions)[number],
                          )
                        }
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
                      >
                        {statusFilterOptions.map((option) => (
                          <option key={option} value={option}>
                            {option === 'All' ? 'All Statuses' : option}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {filteredAlerts.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-slate-400">
                      {data.recentAlerts.length === 0
                        ? 'No risk alerts on record.'
                        : 'No alerts match this filter.'}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                            <th className="px-5 py-2 font-medium">Timestamp</th>
                            <th className="px-5 py-2 font-medium">Detection Type</th>
                            <th className="px-5 py-2 font-medium">Model Source</th>
                            <th className="px-5 py-2 font-medium">Risk Level</th>
                            <th className="px-5 py-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAlerts.map((alert) => (
                            <tr key={alert.id} className="border-t border-slate-100">
                              <td className="px-5 py-3 font-mono text-xs text-slate-500">
                                {formatTimestamp(alert.createdAt)}
                              </td>
                              <td className="px-5 py-3 text-slate-700">{alert.alertType}</td>
                              <td className="px-5 py-3 text-slate-500">
                                {alert.aiToolName ?? 'Unknown tool'}
                              </td>
                              <td className="px-5 py-3">
                                <Badge status={severityBadge[alert.severity] ?? 'warning'}>
                                  {alert.severity}
                                </Badge>
                              </td>
                              <td className="px-5 py-3">
                                <Badge status={alertStatusBadge[alert.status] ?? 'warning'}>
                                  {alert.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <Link
                    to="/risk-alert-center"
                    className="flex items-center gap-1 border-t border-slate-100 px-5 py-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    View All Risk Alerts
                    <ChevronRight size={14} />
                  </Link>
                </Card>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Card className="p-5">
                    <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Risk Distribution by Engine
                    </h2>
                    {distributionSegments.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        No risk alerts in the last 30 days.
                      </p>
                    ) : (
                      <DonutChart segments={distributionSegments} />
                    )}
                  </Card>

                  <Card className="bg-slate-900 p-5 text-white">
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Compliance Score (Today)
                    </h2>
                    <p className="text-3xl font-bold">{data.complianceScore.todayPct}%</p>
                    <p
                      className={
                        data.complianceScore.deltaVsYesterday >= 0
                          ? 'mt-1 text-sm font-medium text-emerald-400'
                          : 'mt-1 text-sm font-medium text-red-400'
                      }
                    >
                      {data.complianceScore.deltaVsYesterday >= 0 ? '+' : ''}
                      {data.complianceScore.deltaVsYesterday}% since yesterday
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-slate-400">
                      {data.complianceScore.todayPct >= 95
                        ? 'Prompt volume today is running within the established governance parameters.'
                        : 'A higher-than-usual share of today\'s prompts were blocked — worth a look in the Risk Alert Center.'}
                    </p>
                  </Card>
                </div>
              </div>

              <div className="space-y-6">
                <Card className="p-5">
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    AI Trust Scores Overview
                  </h2>
                  {data.trustScores.length === 0 ? (
                    <p className="text-sm text-slate-400">No trust evaluations on record yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {data.trustScores.map((entry) => (
                        <div
                          key={entry.toolName}
                          className="border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {entry.toolName}
                              </p>
                              <p className="text-xs text-slate-400">
                                {riskTierLabel[entry.riskTier] ?? entry.riskTier}
                              </p>
                            </div>
                            <span className={`text-xl font-bold ${scoreColor(entry.overallScore)}`}>
                              {entry.overallScore}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[11px] text-slate-400">
                            SECURITY:{' '}
                            <span className="font-medium text-slate-500">
                              {entry.securityScore}
                            </span>
                            {'  '}COMPLIANCE:{' '}
                            <span className="font-medium text-slate-500">
                              {entry.complianceScore}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-5">
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Recently Added AI Tools
                  </h2>
                  {data.recentAiTools.length === 0 ? (
                    <p className="text-sm text-slate-400">No AI tools registered yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.recentAiTools.map((tool) => (
                        <div key={tool.toolName} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{tool.toolName}</p>
                            <p className="text-xs text-slate-400">{tool.vendor}</p>
                          </div>
                          <Badge status={tool.isApproved ? 'good' : 'warning'}>
                            {tool.isApproved ? 'Approved' : 'Pending Review'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link to="/ai-tool-management">
                    <Button variant="secondary" className="mt-4">
                      Manage AI Tools
                    </Button>
                  </Link>
                </Card>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
