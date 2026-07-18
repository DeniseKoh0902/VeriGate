import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { useToast } from '@/context/ToastContext';
import * as riskAlertService from '@/services/riskAlert.service';
import type { RiskAlertAdmin, RiskAlertStatus } from '@/types/riskAlert.types';

const statusBadge: Record<RiskAlertStatus, 'good' | 'warning' | 'serious' | 'critical'> = {
  OPEN: 'critical',
  ESCALATED: 'serious',
  RESOLVED: 'good',
};

const statusLabel: Record<RiskAlertStatus, string> = {
  OPEN: 'Open',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
};

const severityBadge: Record<string, 'good' | 'warning' | 'serious' | 'critical'> = {
  LOW: 'good',
  MEDIUM: 'warning',
  HIGH: 'serious',
  CRITICAL: 'critical',
};

const statusFilters: (RiskAlertStatus | 'All')[] = ['All', 'OPEN', 'ESCALATED', 'RESOLVED'];

function formatDate(date: string) {
  return new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function appealBadgeInfo(
  alert: RiskAlertAdmin,
): { status: 'good' | 'warning' | 'serious' | 'critical' | 'neutral'; label: string } | null {
  if (!alert.appealStatus) return null;
  if (alert.appealStatus === 'RESOLVED') {
    return alert.appealResolution === 'OVERTURNED'
      ? { status: 'good', label: 'Appeal: Overturned' }
      : { status: 'critical', label: 'Appeal: Upheld' };
  }
  if (alert.appealStatus === 'AWAITING_INFO') {
    return { status: 'warning', label: 'Appeal: Awaiting Info' };
  }
  if (alert.appealStatus === 'UNDER_REVIEW') {
    return { status: 'neutral', label: 'Appeal: Under Review' };
  }
  return { status: 'neutral', label: 'Appeal: Pending' };
}

const ALERTS_PER_PAGE = 10;

export function RiskAlertCenterPage() {
  const toast = useToast();
  const [alerts, setAlerts] = useState<RiskAlertAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [filter, setFilter] = useState<RiskAlertStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const loadAlerts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await riskAlertService.listAllRiskAlerts();
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load risk alerts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    if (!selectedId && alerts.length > 0) {
      setSelectedId(alerts[0].id);
    }
  }, [alerts, selectedId]);

  const selected = alerts.find((alert) => alert.id === selectedId) ?? null;

  const searchMatched = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return alerts;

    return alerts.filter((alert) => {
      const haystack = [alert.alertType, alert.employeeName, alert.aiToolName ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [alerts, searchQuery]);

  const sectionCounts = useMemo(() => {
    const counts: Record<RiskAlertStatus | 'All', number> = {
      All: searchMatched.length,
      OPEN: 0,
      ESCALATED: 0,
      RESOLVED: 0,
    };
    for (const alert of searchMatched) {
      counts[alert.status] += 1;
    }
    return counts;
  }, [searchMatched]);

  const filtered = useMemo(() => {
    return filter === 'All' ? searchMatched : searchMatched.filter((a) => a.status === filter);
  }, [searchMatched, filter]);

  useEffect(() => {
    setPage(1);
  }, [filter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ALERTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedAlerts = filtered.slice(
    (currentPage - 1) * ALERTS_PER_PAGE,
    currentPage * ALERTS_PER_PAGE,
  );

  const applyStatusChange = async (
    action: 'resolve' | 'escalate',
    successMessage: string,
  ) => {
    if (!selected || isUpdating) return;

    setIsUpdating(true);
    try {
      const updated =
        action === 'resolve'
          ? await riskAlertService.resolveRiskAlert(selected.id)
          : await riskAlertService.escalateRiskAlert(selected.id);
      setAlerts((prev) => prev.map((alert) => (alert.id === updated.id ? updated : alert)));
      toast.success(successMessage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update this alert.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Risk Alert Center</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review, investigate, and resolve AI-related security risks and governance alerts.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2 divide-y divide-slate-100">
          <div className="px-5 py-4">
            <Input
              placeholder="Search alerts by type, employee, or AI tool…"
              leftIcon={<Search size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-1 px-5 py-3">
            {statusFilters.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  filter === value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100',
                )}
              >
                {value === 'All' ? 'All' : statusLabel[value]} ({sectionCounts[value]})
              </button>
            ))}
          </div>

          {!isLoading && filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              {searchQuery.trim() || filter !== 'All'
                ? 'No alerts match your search.'
                : 'No risk alerts on record.'}
            </div>
          )}

          {pagedAlerts.map((alert) => {
            const appealBadge = appealBadgeInfo(alert);
            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => setSelectedId(alert.id)}
                className={cn(
                  'flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50',
                  selectedId === alert.id && 'bg-blue-50/60',
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{alert.alertType}</p>
                  <p className="text-xs text-slate-400">
                    {alert.aiToolName ?? 'Unknown tool'} · Reported by {alert.employeeName} ·{' '}
                    {formatDate(alert.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={severityBadge[alert.severity] ?? 'neutral'}>{alert.severity}</Badge>
                  <Badge status={statusBadge[alert.status]}>{statusLabel[alert.status]}</Badge>
                  {appealBadge && <Badge status={appealBadge.status}>{appealBadge.label}</Badge>}
                </div>
              </button>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3">
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

        <Card className="p-5">
          {!selected ? (
            <p className="text-sm text-slate-400">
              {isLoading ? 'Loading alerts…' : 'Select an alert to review its details.'}
            </p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Alert Details
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">{selected.alertType}</h2>

              <div className="mt-3 flex items-center gap-2">
                <Badge status={severityBadge[selected.severity] ?? 'neutral'}>
                  {selected.severity}
                </Badge>
                <Badge status={statusBadge[selected.status]}>{statusLabel[selected.status]}</Badge>
                {(() => {
                  const appealBadge = appealBadgeInfo(selected);
                  return appealBadge ? (
                    <Badge status={appealBadge.status}>{appealBadge.label}</Badge>
                  ) : null;
                })()}
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Employee</dt>
                  <dd className="font-medium text-slate-700">{selected.employeeName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">AI tool</dt>
                  <dd className="font-medium text-slate-700">{selected.aiToolName ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Reported</dt>
                  <dd className="font-medium text-slate-700">{formatDate(selected.createdAt)}</dd>
                </div>
              </dl>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                What happened
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {selected.description ?? 'No further detail was recorded for this alert.'}
              </p>

              {selected.promptText && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Prompt Sent
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                    {selected.promptText}
                  </p>
                </div>
              )}

              {selected.status !== 'RESOLVED' && (
                <div className="mt-5 flex gap-2">
                  <Button
                    className="w-auto"
                    isLoading={isUpdating}
                    onClick={() => applyStatusChange('resolve', 'Alert resolved.')}
                  >
                    <Check size={15} />
                    Resolve
                  </Button>
                  {selected.status !== 'ESCALATED' && (
                    <Button
                      variant="secondary"
                      className="w-auto"
                      isLoading={isUpdating}
                      onClick={() => applyStatusChange('escalate', 'Alert escalated.')}
                    >
                      <ArrowUpRight size={15} />
                      Escalate
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
