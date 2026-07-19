import { useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import * as aiToolRequestService from '@/services/aiToolRequest.service';
import type {
  AiToolRequest,
  AiToolRequestCreateInput,
  RequestStatus,
} from '@/types/aiToolRequest.types';

const REQUESTS_PER_PAGE = 5;

const statusBadge: Record<RequestStatus, 'good' | 'warning' | 'critical'> = {
  APPROVED: 'good',
  PENDING: 'warning',
  REJECTED: 'critical',
};

const statusLabel: Record<RequestStatus, string> = {
  APPROVED: 'Approved',
  PENDING: 'Pending',
  REJECTED: 'Rejected',
};

const emptyForm: AiToolRequestCreateInput = {
  toolName: '',
  businessReason: '',
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

  const isFormValid = Boolean(form.toolName.trim() && form.businessReason.trim());

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
    <div className="p-8">
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

      <div className="grid grid-cols-3 items-start gap-6">
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
            <Button type="submit" isLoading={isSubmitting} disabled={!isFormValid}>
              Submit Request
            </Button>
          </form>
          </div>
        </Card>

        <Card className="col-span-2">
          <div className="border-b border-slate-300 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Your Requests</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {!isLoading && requests.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                You haven't submitted any AI tool requests yet.
              </p>
            )}
            {pagedRequests.map((request) => (
              <div key={request.id} className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{request.toolName}</p>
                    <p className="text-xs text-slate-400">{request.department}</p>
                  </div>
                  <Badge status={statusBadge[request.status]}>{statusLabel[request.status]}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{request.businessReason}</p>
                {request.status === 'REJECTED' && request.rejectionReason && (
                  <p className="mt-2 text-xs text-red-600">Reason: {request.rejectionReason}</p>
                )}
              </div>
            ))}
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
