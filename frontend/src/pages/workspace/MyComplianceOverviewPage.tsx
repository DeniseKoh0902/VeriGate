import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

type RecordType = 'Prompt Block' | 'Tool Rejection' | 'Risk Alert';

const records: {
  type: RecordType;
  title: string;
  policy: string;
  date: string;
  status: 'Resolved' | 'Overturned' | 'Upheld' | 'Open';
  appealable: boolean;
}[] = [
  {
    type: 'Prompt Block',
    title: 'Prompt blocked — Financial data detected',
    policy: 'Finance Data Handling Policy',
    date: '2026-07-14',
    status: 'Open',
    appealable: true,
  },
  {
    type: 'Tool Rejection',
    title: 'Midjourney request rejected',
    policy: 'AI Trust Score below threshold',
    date: '2026-07-10',
    status: 'Upheld',
    appealable: false,
  },
  {
    type: 'Risk Alert',
    title: 'Shadow AI Access Detected',
    policy: 'External LLM Usage Policy',
    date: '2026-07-08',
    status: 'Overturned',
    appealable: false,
  },
];

const filters: ('All' | RecordType)[] = ['All', 'Prompt Block', 'Tool Rejection', 'Risk Alert'];

const statusBadge = {
  Open: 'warning',
  Resolved: 'good',
  Overturned: 'good',
  Upheld: 'critical',
} as const;

export function MyComplianceOverviewPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');

  const filtered = useMemo(
    () => (filter === 'All' ? records : records.filter((r) => r.type === filter)),
    [filter],
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Compliance Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your own AI governance history — blocked prompts, rejected tool requests, and risk alerts.
          Sanitized-and-forwarded prompts are informational only and not shown as flags.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Flags</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{records.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Resolved Appeals
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">1</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Current Standing
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">Good Standing</p>
        </Card>
      </div>

      <Card>
        <div className="flex gap-1 border-b border-slate-100 px-5 py-3">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                filter === item ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100',
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((record) => (
            <div key={record.title} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{record.title}</p>
                <p className="text-xs text-slate-400">
                  {record.policy} · {record.date}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge status={statusBadge[record.status]}>{record.status}</Badge>
                {record.appealable && (
                  <Button variant="secondary" className="w-auto">
                    Submit Appeal
                  </Button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              No flagged activity on record.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
