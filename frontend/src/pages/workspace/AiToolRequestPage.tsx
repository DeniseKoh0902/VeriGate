import { useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import * as aiToolRequestService from '@/services/aiToolRequest.service';
import {
  DATA_CATEGORIES,
  type AiToolRequest,
  type AiToolRequestCreateInput,
  type DataCategory,
  type RequestStatus,
} from '@/types/aiToolRequest.types';

const REQUESTS_PER_PAGE = 5;

type DisplayStatus = RequestStatus | 'OVERDUE';

const statusBadge: Record<DisplayStatus, 'good' | 'warning' | 'critical'> = {
  APPROVED: 'good',
  PENDING: 'warning',
  REJECTED: 'critical',
  OVERDUE: 'critical',
};

const statusLabel: Record<DisplayStatus, string> = {
  APPROVED: 'Approved',
  PENDING: 'Pending',
  REJECTED: 'Rejected',
  OVERDUE: 'Overdue',
};

function getDisplayStatus(request: AiToolRequest): DisplayStatus {
  if (request.status === 'PENDING' && request.slaDeadline && new Date(request.slaDeadline) < new Date()) {
    return 'OVERDUE';
  }
  return request.status;
}

function formatDeadline(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const emptyForm: AiToolRequestCreateInput = {
  toolName: '',
  businessReason: '',
  dataCategories: [],
};

export function AiToolRequestPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState<AiToolRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<AiToolRequestCreateInput>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);

  const loadRequests = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setRequests(await aiToolRequestService.listMyRequests());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load your requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const isFormValid = Boolean(
    form.toolName.trim() && form.businessReason.trim() && form.dataCategories.length > 0,
  );

  const toggleDataCategory = (category: DataCategory) => {
    setForm((prev) => ({
      ...prev,
      dataCategories: prev.dataCategories.includes(category)
        ? prev.dataCategories.filter((c) => c !== category)
        : [...prev.dataCategories, category],
    }));
  };

  const totalPages = Math.max(1, Math.ceil(requests.length / REQUESTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedRequests = requests.slice(
    (currentPage - 1) * REQUESTS_PER_PAGE,
    currentPage * REQUESTS_PER_PAGE,
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await aiToolRequestService.createRequest(form);
      setRequests((prev) => [created, ...prev]);
      setForm(emptyForm);
      setPage(1);
      toast.success(`Request for "${created.toolName}" submitted for review.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">AI Tool Request</h1>
        <p className="mt-1 text-sm text-slate-500">
          Request approval for an AI tool that isn't yet on the approved list.
        </p>
      </div>

      {loadError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card>
          <div className="border-b border-slate-300 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              New Request
            </h2>
          </div>

          <div className="px-5 py-4">
          <form className="space-y-4 block text-s" onSubmit={handleSubmit}>
            <Input
              label="AI Tool Name"
              placeholder="e.g. Perplexity Pro"
              value={form.toolName}
              onChange={(e) => setForm({ ...form, toolName: e.target.value })}
              required
            />
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Department
              </label>
              <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                {user?.department ?? '—'}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase text-slate-700">
                Business Justification
              </label>
              <textarea
                rows={4}
                placeholder="Describe the intended business purpose…"
                value={form.businessReason}
                onChange={(e) => setForm({ ...form, businessReason: e.target.value })}
                required
                className="w-full resize-none rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Data This Tool Will Touch
              </label>
              <p className="mb-2 text-xs text-slate-400">Select at least one — this shapes review.</p>
              <div className="space-y-1.5">
                {DATA_CATEGORIES.map((category) => (
                  <label
                    key={category}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={form.dataCategories.includes(category)}
                      onChange={() => toggleDataCategory(category)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20"
                    />
                    {category}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" isLoading={isSubmitting} disabled={!isFormValid}>
              Submit Request
            </Button>
          </form>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="border-b border-slate-300 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Your Requests</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {!isLoading && requests.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                You haven't submitted any AI tool requests yet.
              </p>
            )}
            {pagedRequests.map((request) => {
              const displayStatus = getDisplayStatus(request);
              const deadline = formatDeadline(request.slaDeadline);
              return (
                <div key={request.id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{request.toolName}</p>
                      <p className="text-xs text-slate-400">
                        {request.department}
                        {deadline && request.status === 'PENDING' && (
                          <>
                            {' '}
                            · {displayStatus === 'OVERDUE' ? 'Was due' : 'Due'} {deadline}
                          </>
                        )}
                      </p>
                    </div>
                    <Badge status={statusBadge[displayStatus]}>{statusLabel[displayStatus]}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{request.businessReason}</p>
                  {request.dataCategories.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {request.dataCategories.map((category) => (
                        <span
                          key={category}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  )}
                  {request.status === 'REJECTED' && request.rejectionReason && (
                    <p className="mt-2 text-xs text-red-600">Reason: {request.rejectionReason}</p>
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
    </div>
  );
}
