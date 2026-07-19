import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  MessageCircleQuestion,
  Paperclip,
  Search,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { useToast } from '@/context/ToastContext';
import * as appealService from '@/services/appeal.service';
import type { AppealAdmin } from '@/types/appeal.types';
import type { ComplianceSourceType } from '@/types/compliance.types';

type DisplayStatus = 'PENDING' | 'UNDER_REVIEW' | 'AWAITING_INFO' | 'OVERDUE' | 'RESOLVED';

const sourceTypeLabel: Record<ComplianceSourceType, string> = {
  PROMPT_BLOCK: 'Prompt Block',
  TOOL_REJECTION: 'Tool Rejection',
  RISK_ALERT: 'Risk Alert',
};

const statusBadge: Record<DisplayStatus, 'critical' | 'warning' | 'good' | 'neutral'> = {
  PENDING: 'warning',
  UNDER_REVIEW: 'neutral',
  AWAITING_INFO: 'warning',
  OVERDUE: 'critical',
  RESOLVED: 'good',
};

const statusLabel: Record<DisplayStatus, string> = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  AWAITING_INFO: 'Awaiting Info',
  OVERDUE: 'Overdue',
  RESOLVED: 'Resolved',
};

function getDisplayStatus(appeal: AppealAdmin): DisplayStatus {
  if (appeal.status === 'RESOLVED') return 'RESOLVED';
  if (appeal.status === 'AWAITING_INFO') return 'AWAITING_INFO';
  if (appeal.slaDeadline && new Date(appeal.slaDeadline) < new Date()) return 'OVERDUE';
  return appeal.status;
}

const statusFilters: (DisplayStatus | 'All')[] = [
  'All',
  'PENDING',
  'UNDER_REVIEW',
  'AWAITING_INFO',
  'OVERDUE',
  'RESOLVED',
];

function shortId(id: string) {
  return `APL-${id.slice(0, 8).toUpperCase()}`;
}

function formatDeadline(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

const APPEALS_PER_PAGE = 10;

export function AppealQueuePage() {
  const toast = useToast();
  const [appeals, setAppeals] = useState<AppealAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isRequestingInfo, setIsRequestingInfo] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<DisplayStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const loadAppeals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appealService.listAllAppeals();
      setAppeals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the appeal queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppeals();
  }, []);

  useEffect(() => {
    if (!selectedId && appeals.length > 0) {
      setSelectedId(appeals[0].id);
    }
  }, [appeals, selectedId]);

  const selected = appeals.find((appeal) => appeal.id === selectedId) ?? null;

  const searchMatched = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return appeals;

    return appeals.filter((appeal) => {
      const haystack = [appeal.title, appeal.employeeName, appeal.policy ?? '', shortId(appeal.id)]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [appeals, searchQuery]);

  const sectionCounts = useMemo(() => {
    const counts: Record<DisplayStatus | 'All', number> = {
      All: searchMatched.length,
      PENDING: 0,
      UNDER_REVIEW: 0,
      AWAITING_INFO: 0,
      OVERDUE: 0,
      RESOLVED: 0,
    };
    for (const appeal of searchMatched) {
      counts[getDisplayStatus(appeal)] += 1;
    }
    return counts;
  }, [searchMatched]);

  const filtered = useMemo(() => {
    return filter === 'All'
      ? searchMatched
      : searchMatched.filter((appeal) => getDisplayStatus(appeal) === filter);
  }, [searchMatched, filter]);

  useEffect(() => {
    setPage(1);
  }, [filter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / APPEALS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedAppeals = filtered.slice(
    (currentPage - 1) * APPEALS_PER_PAGE,
    currentPage * APPEALS_PER_PAGE,
  );

  const selectAppeal = (id: string) => {
    setSelectedId(id);
    setNotes('');
    setIsRequestingInfo(false);
    setInfoMessage('');
  };

  const resolve = async (resolution: 'UPHELD' | 'OVERTURNED') => {
    if (!selected || isResolving) return;

    setIsResolving(true);
    try {
      const updated = await appealService.resolveAppeal(selected.id, {
        resolution,
        resolutionNotes: notes.trim() || undefined,
      });
      setAppeals((prev) => prev.map((appeal) => (appeal.id === updated.id ? updated : appeal)));
      setNotes('');
      toast.success(`Appeal ${resolution === 'OVERTURNED' ? 'overturned' : 'upheld'}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to resolve this appeal.');
    } finally {
      setIsResolving(false);
    }
  };

  const requestMoreInfo = async () => {
    if (!selected || !infoMessage.trim() || isSubmittingInfo) return;

    setIsSubmittingInfo(true);
    try {
      const updated = await appealService.requestMoreInfo(selected.id, {
        message: infoMessage.trim(),
      });
      setAppeals((prev) => prev.map((appeal) => (appeal.id === updated.id ? updated : appeal)));
      setInfoMessage('');
      setIsRequestingInfo(false);
      toast.success('Requested more information from the employee.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to request more information.');
    } finally {
      setIsSubmittingInfo(false);
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Appeal Queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review disputed prompt blocks, tool rejections, and risk alerts, and uphold or overturn the
          original governance decision.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="divide-y divide-slate-100 lg:col-span-2">
          <div className="px-5 py-4">
            <Input
              placeholder="Search appeals by employee, title, or policy…"
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
                {value === 'All' ? 'All' : statusLabel[value]} (
                <span
                  className={cn(
                    value === 'OVERDUE' && sectionCounts[value] > 0 && 'text-red-600'
                  )}
                >
                  {sectionCounts[value]}
                </span>
                )
              </button>
            ))}
          </div>

          {!isLoading && filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              {searchQuery.trim() || filter !== 'All'
                ? 'No appeals match your search.'
                : 'No appeals to review.'}
            </div>
          )}
          {pagedAppeals.map((appeal) => {
            const displayStatus = getDisplayStatus(appeal);
            return (
              <button
                key={appeal.id}
                type="button"
                onClick={() => selectAppeal(appeal.id)}
                className={cn(
                  'flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50',
                  selectedId === appeal.id && 'bg-blue-50/60',
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge status="neutral">{sourceTypeLabel[appeal.sourceType]}</Badge>
                    <p className="text-sm font-semibold text-slate-900">{appeal.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {appeal.employeeName} · {shortId(appeal.id)} · SLA {formatDeadline(appeal.slaDeadline)}
                  </p>
                </div>
                <Badge status={statusBadge[displayStatus]}>{statusLabel[displayStatus]}</Badge>
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
                  <ChevronLeft size={15} />
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
                  <ChevronRight size={15} />
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          {!selected ? (
            <p className="text-sm text-slate-400">
              {isLoading ? 'Loading appeals…' : 'Select an appeal to review its details.'}
            </p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Appeal Details · {shortId(selected.id)}
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">{selected.title}</h2>

              <div className="mt-3 flex items-center gap-2">
                <Badge status="neutral">{sourceTypeLabel[selected.sourceType]}</Badge>
                <Badge status={statusBadge[getDisplayStatus(selected)]}>
                  {statusLabel[getDisplayStatus(selected)]}
                </Badge>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Employee</dt>
                  <dd className="font-medium text-slate-700">{selected.employeeName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Policy triggered</dt>
                  <dd className="font-medium text-slate-700">{selected.policy ?? '—'}</dd>
                </div>
              </dl>

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

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Employee justification
              </p>
              <p className="mt-1 text-sm text-slate-600">{selected.justification}</p>

              {selected.evidenceUrl && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-blue-600">
                  <Paperclip size={12} />
                  {selected.evidenceUrl}
                </p>
              )}

              {selected.status === 'RESOLVED' ? (
                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Resolution: {selected.resolution === 'OVERTURNED' ? 'Overturned' : 'Upheld'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {selected.resolutionNotes ?? 'No resolution notes were provided.'}
                  </p>
                </div>
              ) : selected.status === 'AWAITING_INFO' ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Waiting on employee response
                  </p>
                  <p className="mt-1 text-sm text-amber-900">{selected.additionalInfoRequest}</p>
                </div>
              ) : (
                <>
                  {selected.employeeResponse && (
                    <div className="mt-4 rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Employee's response
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{selected.employeeResponse}</p>
                    </div>
                  )}

                  {isRequestingInfo ? (
                    <>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Additional information required
                      </p>
                      <textarea
                        value={infoMessage}
                        onChange={(e) => setInfoMessage(e.target.value)}
                        rows={3}
                        placeholder="Please provide evidence that the detected API key is a placeholder and not a production key…"
                        className="mt-1 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                      <div className="mt-2 flex gap-2">
                        <Button
                          className="w-auto"
                          isLoading={isSubmittingInfo}
                          disabled={!infoMessage.trim()}
                          onClick={requestMoreInfo}
                        >
                          <MessageCircleQuestion size={15} />
                          Send Request
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-auto"
                          onClick={() => {
                            setIsRequestingInfo(false);
                            setInfoMessage('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Resolution notes
                      </p>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Explain the reasoning behind your decision…"
                        className="mt-1 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          className="w-auto"
                          isLoading={isResolving}
                          onClick={() => resolve('OVERTURNED')}
                        >
                          <Check size={15} />
                          Overturn
                        </Button>
                        <Button
                          variant="secondary"
                          className="w-auto"
                          isLoading={isResolving}
                          onClick={() => resolve('UPHELD')}
                        >
                          <X size={15} />
                          Uphold
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-auto"
                          onClick={() => setIsRequestingInfo(true)}
                        >
                          <MessageCircleQuestion size={15} />
                          Request More Info
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
