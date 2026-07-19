import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, Download, Filter, RefreshCw, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import * as auditLogService from '@/services/auditLog.service';
import type { AuditLog, AuditLogDetail } from '@/types/auditLog.types';

type ResultTone = 'good' | 'warning' | 'critical' | 'neutral';

// Explicit per-entity-type mapping rather than a global keyword guess: each
// entity type has its own small, known set of actions, so every one of them
// gets a deliberate classification instead of an ambiguous substring match
// (e.g. "Removed" means something different for a deletion than "Requested"
// does for an appeal awaiting info). Matched by prefix since some actions
// (e.g. "Policy Removed") have a dynamic suffix appended (the entity's name).
const RESULT_RULES: Record<string, { prefix: string; tone: ResultTone }[]> = {
  Auth: [
    { prefix: 'Login Succeeded', tone: 'good' },
    { prefix: 'Login Failed', tone: 'critical' },
    { prefix: 'Login Blocked', tone: 'critical' },
  ],
  Prompt: [
    { prefix: 'Prompt Blocked', tone: 'critical' },
    { prefix: 'Prompt Sanitized', tone: 'warning' },
    { prefix: 'Prompt Forwarded', tone: 'good' },
  ],
  Appeal: [
    { prefix: 'Appeal Upheld', tone: 'good' },
    { prefix: 'Appeal Overturned', tone: 'good' },
    { prefix: 'Appeal Info Requested', tone: 'warning' },
    { prefix: 'Appeal Response Submitted', tone: 'neutral' },
    { prefix: 'Appeal Submitted', tone: 'neutral' },
  ],
  RiskAlert: [
    { prefix: 'Risk Alert Resolved', tone: 'good' },
    { prefix: 'Risk Alert Escalated', tone: 'warning' },
  ],
  AiTool: [
    { prefix: 'AI Tool Added', tone: 'good' },
    { prefix: 'AI Tool Updated', tone: 'good' },
    { prefix: 'AI Tool Removed', tone: 'warning' },
    { prefix: 'AI Trust Evaluation Recorded', tone: 'good' },
  ],
  Policy: [
    { prefix: 'Policy Created', tone: 'good' },
    { prefix: 'Policy Updated', tone: 'good' },
    { prefix: 'Policy Removed', tone: 'warning' },
  ],
  SensitiveDataRule: [
    { prefix: 'Sensitive Data Rule Created', tone: 'good' },
    { prefix: 'Sensitive Data Rule Updated', tone: 'good' },
    { prefix: 'Sensitive Data Rule Removed', tone: 'warning' },
  ],
  User: [
    { prefix: 'Employee Created', tone: 'good' },
    { prefix: 'Employee Updated', tone: 'good' },
    { prefix: 'Employee Removed', tone: 'warning' },
  ],
  AiToolRequest: [{ prefix: 'AI Tool Request Submitted', tone: 'neutral' }],
  PolicyRecommendation: [
    { prefix: 'Policy Recommendation Accepted', tone: 'good' },
    { prefix: 'Policy Recommendation Modified', tone: 'good' },
    { prefix: 'Policy Recommendation Rejected', tone: 'warning' },
    { prefix: 'Policy Recommendation Generated', tone: 'neutral' },
  ],
};

function resultTone(entityType: string, action: string): ResultTone {
  const rule = RESULT_RULES[entityType]?.find((r) => action.startsWith(r.prefix));
  return rule?.tone ?? 'neutral';
}

function resultLabel(tone: ResultTone): string {
  switch (tone) {
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Warning';
    case 'good':
      return 'Success';
    default:
      return 'Info';
  }
}

const ENTITY_TYPE_LABEL: Record<string, string> = {
  Auth: 'Login',
  Prompt: 'Prompts',
  Appeal: 'Appeals',
  RiskAlert: 'Risk Alerts',
  AiTool: 'AI Tools',
  AiToolRequest: 'Tool Requests',
  SensitiveDataRule: 'Sensitive Data Rules',
  Policy: 'Policies',
  User: 'Employees',
  PolicyRecommendation: 'Policy Recommendations',
};

function entityTypeLabel(entityType: string) {
  return ENTITY_TYPE_LABEL[entityType] ?? entityType;
}

const DATE_RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
] as const;

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

function toCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadCsv(logs: AuditLog[]) {
  const header = ['Timestamp', 'Employee', 'Department', 'AI Tool', 'Event', 'Result'];
  const rows = logs.map((log) => [
    formatTimestamp(log.createdAt),
    log.employeeName ?? log.entityId,
    log.department ?? '',
    log.aiToolName ?? '',
    log.action,
    resultLabel(resultTone(log.entityType, log.action)),
  ]);

  const csv = [header, ...rows].map((row) => row.map(toCsvValue).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm text-slate-700">{children}</div>
    </div>
  );
}

function AuditLogDetailContent({ detail }: { detail: AuditLogDetail }) {
  const hasAnyDetail =
    detail.promptText ||
    detail.justification ||
    detail.resolutionNotes ||
    detail.alertType ||
    detail.description ||
    detail.vendor ||
    detail.policyName ||
    detail.category ||
    detail.targetRole ||
    detail.toolName ||
    detail.recommendationTitle;

  if (!hasAnyDetail) {
    return <p className="text-sm text-slate-400">No further detail was recorded for this event.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {detail.justification && (
        <DetailField label="Employee Justification">
          <p className="whitespace-pre-wrap">{detail.justification}</p>
        </DetailField>
      )}
      {detail.resolutionNotes && (
        <DetailField label="Resolution Notes">
          <p className="whitespace-pre-wrap">{detail.resolutionNotes}</p>
        </DetailField>
      )}
      {(detail.policyName || detail.alertType || detail.severity || detail.description) && (
        <DetailField label={detail.policyName ? 'Policy' : detail.alertType ? 'Alert' : 'Description'}>
          <p>{detail.policyName ?? detail.description ?? detail.alertType}</p>
          {detail.severity && <p className="mt-0.5 text-xs text-slate-500">Severity: {detail.severity}</p>}
          {detail.appliesToDepartment && (
            <p className="mt-0.5 text-xs text-slate-500">Applies to: {detail.appliesToDepartment}</p>
          )}
        </DetailField>
      )}
      {(detail.vendor || detail.version || detail.riskTier) && (
        <DetailField label="AI Tool">
          <p>
            {[detail.vendor, detail.version].filter(Boolean).join(' · ') || '—'}
            {detail.riskTier && ` · ${detail.riskTier}`}
          </p>
        </DetailField>
      )}
      {(detail.category || detail.riskLevel || detail.ruleAction) && (
        <DetailField label="Sensitive Data Rule">
          <p>
            {detail.category} · {detail.riskLevel} · {detail.ruleAction}
          </p>
        </DetailField>
      )}
      {(detail.targetRole || detail.targetDepartment || detail.targetIsActive !== null) && (
        <DetailField label="Employee Record">
          <p>
            {detail.targetRole} · {detail.targetDepartment}
            {detail.targetIsActive === false && ' · Deactivated'}
          </p>
        </DetailField>
      )}
      {(detail.toolName || detail.businessReason) && (
        <DetailField label="Tool Requested">
          <p>{detail.toolName}</p>
          {detail.businessReason && <p className="mt-0.5 text-xs text-slate-500">{detail.businessReason}</p>}
        </DetailField>
      )}
      {detail.promptText && (
        <DetailField label="Prompt Sent">
          <p className="whitespace-pre-wrap">{detail.promptText}</p>
        </DetailField>
      )}
      {detail.sanitizedText && (
        <DetailField label="Sanitized To">
          <p className="whitespace-pre-wrap">{detail.sanitizedText}</p>
        </DetailField>
      )}
      {detail.riskFindings.length > 0 && (
        <DetailField label="Detected">
          <div className="flex flex-wrap gap-2">
            {detail.riskFindings.map((finding, index) => (
              <span
                key={index}
                className="rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700"
              >
                {finding.category} · {finding.riskLevel}
              </span>
            ))}
          </div>
        </DetailField>
      )}
      {detail.responseText && (
        <DetailField label="AI Response">
          <p className="whitespace-pre-wrap">{detail.responseText}</p>
        </DetailField>
      )}
      {detail.recommendationTitle && (
        <DetailField label="Policy Recommendation">
          <p>{detail.recommendationTitle}</p>
          {detail.recommendationRationale && (
            <p className="mt-0.5 text-xs text-slate-500">{detail.recommendationRationale}</p>
          )}
          <p className="mt-0.5 text-xs text-slate-500">
            Status: {detail.recommendationStatus}
            {detail.recommendationDepartment && ` · Applies to: ${detail.recommendationDepartment}`}
            {detail.recommendationConfidenceScore !== null &&
              ` · ${detail.recommendationConfidenceScore}% confidence`}
          </p>
        </DetailField>
      )}
    </div>
  );
}

const LOGS_PER_PAGE = 15;

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setClock] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [department, setDepartment] = useState('All');
  const [aiTool, setAiTool] = useState('All');
  const [dateRange, setDateRange] = useState<(typeof DATE_RANGES)[number]['value']>('30');
  const [entityType, setEntityType] = useState('All');
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [detailsById, setDetailsById] = useState<Record<string, AuditLogDetail>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  const loadLogs = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const data = await auditLogService.listAuditLogs();
      setLogs(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load audit logs.');
    } finally {
      if (isManualRefresh) setIsRefreshing(false);
      else setIsLoading(false);
    }
  };

  const fetchDetail = async (log: AuditLog) => {
    setLoadingDetailId(log.id);
    try {
      const detail = await auditLogService.getAuditLogDetail(log.id);
      setDetailsById((prev) => ({ ...prev, [log.id]: detail }));
    } catch {
      // Leave it uncached; the expanded row shows a retry affordance.
    } finally {
      setLoadingDetailId(null);
    }
  };

  const toggleDetails = (log: AuditLog) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(log.id)) next.delete(log.id);
      else next.add(log.id);
      return next;
    });

    if (!detailsById[log.id]) {
      fetchDetail(log);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Re-renders once a second purely so the "Updated Xs ago" label stays
  // current — no network activity involved.
  useEffect(() => {
    const interval = setInterval(() => setClock((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(logs.map((l) => l.department).filter((d): d is string => !!d))).sort(),
    [logs],
  );
  const aiTools = useMemo(
    () => Array.from(new Set(logs.map((l) => l.aiToolName).filter((t): t is string => !!t))).sort(),
    [logs],
  );
  const entityTypes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entityType))).sort(),
    [logs],
  );

  const preTypeFiltered = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    const cutoff =
      dateRange === 'all' ? null : Date.now() - Number(dateRange) * 24 * 60 * 60 * 1000;

    return logs.filter((log) => {
      if (department !== 'All' && log.department !== department) return false;
      if (aiTool !== 'All' && log.aiToolName !== aiTool) return false;
      if (cutoff !== null && new Date(log.createdAt).getTime() < cutoff) return false;
      if (term) {
        const haystack = [log.action, log.employeeName ?? '', log.department ?? '', log.aiToolName ?? '']
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [logs, searchQuery, department, aiTool, dateRange]);

  const entityTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { All: preTypeFiltered.length };
    for (const log of preTypeFiltered) {
      counts[log.entityType] = (counts[log.entityType] ?? 0) + 1;
    }
    return counts;
  }, [preTypeFiltered]);

  const filtered = useMemo(() => {
    return entityType === 'All'
      ? preTypeFiltered
      : preTypeFiltered.filter((log) => log.entityType === entityType);
  }, [preTypeFiltered, entityType]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, department, aiTool, dateRange, entityType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / LOGS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedLogs = filtered.slice((currentPage - 1) * LOGS_PER_PAGE, currentPage * LOGS_PER_PAGE);

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review AI usage history, user activities, governance events, and policy violations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400">Updated {formatRelativeTime(lastUpdated)}</span>
          )}
          <Button
            variant="secondary"
            className="w-auto"
            onClick={() => loadLogs(true)}
            isLoading={isRefreshing}
          >
            <RefreshCw size={15} />
            Refresh
          </Button>
          <Button
            variant="secondary"
            className="w-auto"
            onClick={() => downloadCsv(filtered)}
            disabled={filtered.length === 0}
          >
            <Download size={15} />
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <Input
            placeholder="Search by employee, event, department, or AI tool…"
            leftIcon={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <Filter size={15} className="text-slate-400" />
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          >
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={aiTool}
            onChange={(e) => setAiTool(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          >
            <option value="All">All AI Models</option>
            {aiTools.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          >
            {DATE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={() => setEntityType('All')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              entityType === 'All' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100',
            )}
          >
            All ({entityTypeCounts.All ?? 0})
          </button>
          {entityTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setEntityType(type)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                entityType === type ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100',
              )}
            >
              {entityTypeLabel(type)} ({entityTypeCounts[type] ?? 0})
            </button>
          ))}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            {logs.length === 0 ? 'No audit activity on record.' : 'No logs match your search.'}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2 font-medium">Timestamp</th>
                <th className="px-5 py-2 font-medium">Employee</th>
                <th className="px-5 py-2 font-medium">Department</th>
                <th className="px-5 py-2 font-medium">AI Model</th>
                <th className="px-5 py-2 font-medium">Event</th>
                <th className="px-5 py-2 font-medium">Result</th>
                <th className="px-5 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {pagedLogs.map((log) => {
                const tone = resultTone(log.entityType, log.action);
                const isExpanded = expandedIds.has(log.id);
                const detail = detailsById[log.id];
                const isLoadingDetail = loadingDetailId === log.id;
                return (
                  <Fragment key={log.id}>
                    <tr className="border-t border-slate-100">
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">
                        {formatTimestamp(log.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-slate-700">{log.employeeName ?? log.entityId}</td>
                      <td className="px-5 py-3 text-slate-500">{log.department ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-500">{log.aiToolName ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-700">{log.action}</td>
                      <td className="px-5 py-3">
                        <Badge status={tone}>{resultLabel(tone)}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleDetails(log)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
                        >
                          Details
                          <ChevronDown
                            size={14}
                            className={cn('transition-transform', isExpanded && 'rotate-180')}
                          />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-t border-slate-100 bg-slate-50">
                        <td colSpan={7} className="px-5 py-4">
                          {isLoadingDetail && (
                            <p className="text-sm text-slate-400">Loading details…</p>
                          )}
                          {!isLoadingDetail && detail && <AuditLogDetailContent detail={detail} />}
                          {!isLoadingDetail && !detail && (
                            <p className="text-sm text-slate-400">
                              Unable to load details.{' '}
                              <button
                                type="button"
                                className="font-medium text-slate-600 underline"
                                onClick={() => fetchDetail(log)}
                              >
                                Retry
                              </button>
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <span className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="w-auto px-3 py-1.5"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-auto px-3 py-1.5"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
