import { useState } from 'react';
import { Check, X, MessageCircleQuestion, Paperclip } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

type AppealStatus = 'Pending' | 'Under Review' | 'Overdue' | 'Resolved';
type SourceType = 'Prompt Block' | 'Tool Rejection' | 'Risk Alert';

interface AppealRecord {
  id: string;
  sourceType: SourceType;
  title: string;
  employee: string;
  policy: string;
  justification: string;
  evidence: string | null;
  status: AppealStatus;
  resolution: 'Upheld' | 'Overturned' | null;
  resolutionNotes: string | null;
  slaDeadline: string;
}

const initialAppeals: AppealRecord[] = [
  {
    id: 'APL-1042',
    sourceType: 'Prompt Block',
    title: 'Prompt blocked — Financial data detected',
    employee: 'Aiman Rahman',
    policy: 'Finance Data Handling Policy',
    justification:
      'The account figures were already publicly disclosed in the quarterly earnings report I was summarizing — this was not confidential information.',
    evidence: null,
    status: 'Overdue',
    resolution: null,
    resolutionNotes: null,
    slaDeadline: '2026-07-16 14:23',
  },
  {
    id: 'APL-1041',
    sourceType: 'Tool Rejection',
    title: 'Midjourney request rejected',
    employee: 'Wei Ling Chua',
    policy: 'AI Trust Score below threshold',
    justification:
      'We only need it for internal mockups, not customer-facing content, so the IP-verification concern raised in the evaluation doesn\'t apply to our use case.',
    evidence: 'internal-mockup-brief.pdf',
    status: 'Under Review',
    resolution: null,
    resolutionNotes: null,
    slaDeadline: '2026-07-18 10:00',
  },
  {
    id: 'APL-1040',
    sourceType: 'Risk Alert',
    title: 'Unauthorized Data Export flagged',
    employee: 'Priya Nair',
    policy: 'External LLM Usage Policy',
    justification:
      'The export destination was our own internal CRM, not an external endpoint — this was flagged because the endpoint whitelist was out of date.',
    evidence: null,
    status: 'Pending',
    resolution: null,
    resolutionNotes: null,
    slaDeadline: '2026-07-19 09:00',
  },
  {
    id: 'APL-1039',
    sourceType: 'Risk Alert',
    title: 'Shadow AI Access Detected',
    employee: 'Marcus Tan',
    policy: 'External LLM Usage Policy',
    justification:
      'The endpoint in question is our approved staging environment, not an unauthorized third party — it was likely misclassified by DNS pattern matching.',
    evidence: null,
    status: 'Resolved',
    resolution: 'Overturned',
    resolutionNotes: 'Confirmed as a false positive. Staging endpoint added to the approved list.',
    slaDeadline: '2026-07-15 12:00',
  },
];

const statusBadge: Record<AppealStatus, 'critical' | 'warning' | 'good' | 'neutral'> = {
  Pending: 'warning',
  'Under Review': 'neutral',
  Overdue: 'critical',
  Resolved: 'good',
};

export function AppealQueuePage() {
  const [appeals, setAppeals] = useState(initialAppeals);
  const [selectedId, setSelectedId] = useState(initialAppeals[0].id);
  const [notes, setNotes] = useState('');
  const selected = appeals.find((appeal) => appeal.id === selectedId)!;

  const resolve = (resolution: 'Upheld' | 'Overturned') => {
    setAppeals((prev) =>
      prev.map((appeal) =>
        appeal.id === selectedId
          ? { ...appeal, status: 'Resolved', resolution, resolutionNotes: notes || appeal.resolutionNotes }
          : appeal,
      ),
    );
    setNotes('');
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Appeal Queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review disputed prompt blocks, tool rejections, and risk alerts, and uphold or overturn the
          original governance decision.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2 divide-y divide-slate-100">
          {appeals.map((appeal) => (
            <button
              key={appeal.id}
              type="button"
              onClick={() => {
                setSelectedId(appeal.id);
                setNotes('');
              }}
              className={cn(
                'flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50',
                selectedId === appeal.id && 'bg-blue-50/60',
              )}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Badge status="neutral">{appeal.sourceType}</Badge>
                  <p className="text-sm font-semibold text-slate-900">{appeal.title}</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {appeal.employee} · {appeal.id} · SLA {appeal.slaDeadline}
                </p>
              </div>
              <Badge status={statusBadge[appeal.status]}>{appeal.status}</Badge>
            </button>
          ))}
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Appeal Details · {selected.id}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{selected.title}</h2>

          <div className="mt-3 flex items-center gap-2">
            <Badge status="neutral">{selected.sourceType}</Badge>
            <Badge status={statusBadge[selected.status]}>{selected.status}</Badge>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">Employee</dt>
              <dd className="font-medium text-slate-700">{selected.employee}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Policy triggered</dt>
              <dd className="font-medium text-slate-700">{selected.policy}</dd>
            </div>
          </dl>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Employee justification
          </p>
          <p className="mt-1 text-sm text-slate-600">{selected.justification}</p>

          {selected.evidence && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-blue-600">
              <Paperclip size={12} />
              {selected.evidence}
            </p>
          )}

          {selected.status === 'Resolved' ? (
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Resolution: {selected.resolution}
              </p>
              <p className="mt-1 text-sm text-slate-600">{selected.resolutionNotes}</p>
            </div>
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
                <Button className="w-auto" onClick={() => resolve('Overturned')}>
                  <Check size={15} />
                  Overturn
                </Button>
                <Button variant="secondary" className="w-auto" onClick={() => resolve('Upheld')}>
                  <X size={15} />
                  Uphold
                </Button>
                <Button variant="ghost" className="w-auto">
                  <MessageCircleQuestion size={15} />
                  Request More Info
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
