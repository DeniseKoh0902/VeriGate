import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { useToast } from '@/context/ToastContext';
import * as complianceService from '@/services/compliance.service';
import * as appealService from '@/services/appeal.service';
import type {
  ComplianceOverview,
  ComplianceRecord,
  ComplianceSourceType,
  FlagStatus,
} from '@/types/compliance.types';

const filters: { value: ComplianceSourceType | 'All'; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'PROMPT_BLOCK', label: 'Prompt Block' },
  { value: 'TOOL_REJECTION', label: 'Tool Rejection' },
  { value: 'RISK_ALERT', label: 'Risk Alert' },
];

const flagStatusBadge: Record<FlagStatus, 'good' | 'warning' | 'critical' | 'neutral'> = {
  OPEN: 'warning',
  APPEAL_PENDING: 'neutral',
  APPEAL_UNDER_REVIEW: 'neutral',
  APPEAL_AWAITING_INFO: 'warning',
  UPHELD: 'critical',
  OVERTURNED: 'good',
};

const flagStatusLabel: Record<FlagStatus, string> = {
  OPEN: 'Open',
  APPEAL_PENDING: 'Appeal Pending',
  APPEAL_UNDER_REVIEW: 'Under Review',
  APPEAL_AWAITING_INFO: 'Awaiting Your Response',
  UPHELD: 'Upheld',
  OVERTURNED: 'Overturned',
};

const standingDisplay: Record<ComplianceOverview['standing'], { label: string; className: string }> = {
  GOOD_STANDING: { label: 'Good Standing', className: 'text-emerald-600' },
  NEEDS_ATTENTION: { label: 'Needs Attention', className: 'text-amber-600' },
  UNDER_REVIEW: { label: 'Under Review', className: 'text-blue-600' },
};

function formatRecordDate(date: string) {
  return new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

const RECORDS_PER_PAGE = 10;

export function MyComplianceOverviewPage() {
  const toast = useToast();
  const [overview, setOverview] = useState<ComplianceOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ComplianceSourceType | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const [appealTargetId, setAppealTargetId] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [respondTargetId, setRespondTargetId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  const loadOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setOverview(await complianceService.getComplianceOverview());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your compliance overview.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const searchMatched = useMemo(() => {
    if (!overview) return [];
    const term = searchQuery.trim().toLowerCase();
    if (!term) return overview.records;

    return overview.records.filter((record) => {
      const haystack = [record.title, record.policy ?? '', formatRecordDate(record.date)]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [overview, searchQuery]);

  const sectionCounts = useMemo(() => {
    const counts: Record<ComplianceSourceType | 'All', number> = {
      All: searchMatched.length,
      PROMPT_BLOCK: 0,
      TOOL_REJECTION: 0,
      RISK_ALERT: 0,
    };
    for (const record of searchMatched) {
      counts[record.sourceType] += 1;
    }
    return counts;
  }, [searchMatched]);

  const filtered = useMemo(() => {
    return filter === 'All' ? searchMatched : searchMatched.filter((r) => r.sourceType === filter);
  }, [searchMatched, filter]);

  useEffect(() => {
    setPage(1);
  }, [filter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / RECORDS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedRecords = filtered.slice(
    (currentPage - 1) * RECORDS_PER_PAGE,
    currentPage * RECORDS_PER_PAGE,
  );

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openAppealForm = (record: ComplianceRecord) => {
    setAppealTargetId(record.id);
    setJustification('');
  };

  const cancelAppealForm = () => {
    setAppealTargetId(null);
    setJustification('');
  };

  const submitAppeal = async (event: FormEvent, record: ComplianceRecord) => {
    event.preventDefault();
    if (!justification.trim() || isSubmittingAppeal) return;

    setIsSubmittingAppeal(true);
    try {
      await appealService.createAppeal({
        sourceType: record.sourceType,
        sourceId: record.id,
        justification: justification.trim(),
      });
      toast.success('Appeal submitted for review.');
      setAppealTargetId(null);
      setJustification('');
      await loadOverview();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to submit appeal.');
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  const openRespondForm = (record: ComplianceRecord) => {
    setRespondTargetId(record.id);
    setResponseText('');
  };

  const cancelRespondForm = () => {
    setRespondTargetId(null);
    setResponseText('');
  };

  const submitResponse = async (event: FormEvent, record: ComplianceRecord) => {
    event.preventDefault();
    if (!responseText.trim() || !record.appealId || isSubmittingResponse) return;

    setIsSubmittingResponse(true);
    try {
      await appealService.respondToInfoRequest(record.appealId, {
        response: responseText.trim(),
      });
      toast.success('Response submitted for review.');
      setRespondTargetId(null);
      setResponseText('');
      await loadOverview();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to submit your response.');
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const standing = overview ? standingDisplay[overview.standing] : null;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Compliance Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your own AI governance history — blocked prompts, rejected tool requests, and risk alerts.
          Sanitized-and-forwarded prompts are informational only and not shown as flags.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Flags</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{overview?.totalFlags ?? '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Resolved Appeals
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{overview?.resolvedAppeals ?? '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Current Standing
          </p>
          <p className={cn('mt-2 text-2xl font-bold', standing?.className ?? 'text-slate-400')}>
            {standing?.label ?? '—'}
          </p>
        </Card>
      </div>

      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <Input
            placeholder="Search incidents by policy, title, or date…"
            leftIcon={<Search size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-5 py-3">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                filter === item.value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100',
              )}
            >
              {item.label} ({sectionCounts[item.value]})
            </button>
          ))}
        </div>

        <div className="divide-y divide-slate-100">
          {!isLoading && filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              {searchQuery.trim() || filter !== 'All'
                ? 'No incidents match your search.'
                : 'No flagged activity on record.'}
            </div>
          )}
          {pagedRecords.map((record) => {
            const isExpanded = expandedIds.has(record.id);
            return (
            <div key={record.id} className="px-5 py-4 transition-colors hover:bg-slate-50">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleExpanded(record.id)}
                  className="flex flex-1 items-start gap-2 text-left"
                >
                  <ChevronDown
                    size={16}
                    className={cn(
                      'mt-0.5 shrink-0 text-slate-400 transition-transform',
                      isExpanded && 'rotate-180',
                    )}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{record.title}</p>
                    <p className="text-xs text-slate-400">
                      {record.policy ?? 'No policy on record'} · {formatRecordDate(record.date)}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-3">
                  <Badge status={flagStatusBadge[record.flagStatus]}>
                    {flagStatusLabel[record.flagStatus]}
                  </Badge>
                  {record.appealable && appealTargetId !== record.id && (
                    <Button variant="secondary" className="w-auto" onClick={() => openAppealForm(record)}>
                      Submit Appeal
                    </Button>
                  )}
                  {record.flagStatus === 'APPEAL_AWAITING_INFO' && respondTargetId !== record.id && (
                    <Button variant="secondary" className="w-auto" onClick={() => openRespondForm(record)}>
                      Respond
                    </Button>
                  )}
                </div>
              </div>

              {record.flagStatus === 'APPEAL_AWAITING_INFO' && record.additionalInfoRequest && (
                <div className="mt-3 ml-6 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Compliance officer requested
                  </p>
                  <p className="mt-1 text-sm text-amber-900">{record.additionalInfoRequest}</p>
                </div>
              )}

              {isExpanded && (
                <div className="mt-3 ml-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  {record.sourceType === 'PROMPT_BLOCK' && (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Prompt Sent
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-slate-700">{record.promptText}</p>
                      {record.riskFindings.length > 0 && (
                        <>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Detected
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {record.riskFindings.map((finding, index) => (
                              <span
                                key={index}
                                className="rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700"
                              >
                                {finding.category} · {finding.riskLevel}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {record.sourceType === 'TOOL_REJECTION' && (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Business Justification
                      </p>
                      <p className="mt-1 text-slate-700">{record.businessReason}</p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Department
                      </p>
                      <p className="mt-1 text-slate-700">{record.department}</p>
                      {record.rejectionReason && (
                        <>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Rejection Reason
                          </p>
                          <p className="mt-1 text-slate-700">{record.rejectionReason}</p>
                        </>
                      )}
                    </>
                  )}

                  {record.sourceType === 'RISK_ALERT' && (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Alert Details
                      </p>
                      <p className="mt-1 text-slate-700">{record.description ?? record.alertType}</p>
                      {record.severity && (
                        <p className="mt-2 text-xs text-slate-500">
                          Severity: <span className="font-medium text-slate-700">{record.severity}</span>
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {appealTargetId === record.id && (
                <form
                  className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                  onSubmit={(e) => submitAppeal(e, record)}
                >
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Why should this decision be reconsidered?
                  </label>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={3}
                    placeholder="Explain why you believe this was a false positive or incorrect decision…"
                    required
                    className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="submit"
                      className="w-auto"
                      isLoading={isSubmittingAppeal}
                      disabled={!justification.trim()}
                    >
                      Submit
                    </Button>
                    <Button type="button" variant="ghost" className="w-auto" onClick={cancelAppealForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {respondTargetId === record.id && (
                <form
                  className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                  onSubmit={(e) => submitResponse(e, record)}
                >
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Your response
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={3}
                    placeholder="Provide the information the compliance officer requested…"
                    required
                    className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="submit"
                      className="w-auto"
                      isLoading={isSubmittingResponse}
                      disabled={!responseText.trim()}
                    >
                      Submit
                    </Button>
                    <Button type="button" variant="ghost" className="w-auto" onClick={cancelRespondForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
            );
          })}
        </div>

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
    </div>
  );
}
