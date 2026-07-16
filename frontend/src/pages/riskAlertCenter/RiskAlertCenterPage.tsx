import { useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

const riskAlerts = [
  {
    id: 'ALT-2041',
    type: 'PII Leakage Attempt',
    model: 'GPT-4 Turbo',
    employee: 'Aiman Rahman',
    risk: 'critical' as const,
    detail:
      'Prompt contained a customer NRIC and phone number that would have been forwarded to an external endpoint.',
    recommended: 'Intercept and notify the employee of the sanitized alternative.',
    status: 'Open',
  },
  {
    id: 'ALT-2040',
    type: 'Prompt Injection (Jailbreak)',
    model: 'Claude 3 Opus',
    employee: 'Marcus Tan',
    risk: 'critical' as const,
    detail: 'Prompt attempted to override system instructions to bypass content policy.',
    recommended: 'Block submission and flag account for review.',
    status: 'Open',
  },
  {
    id: 'ALT-2039',
    type: 'Shadow AI Access Detected',
    model: 'Unknown Endpoint',
    employee: 'Wei Ling Chua',
    risk: 'serious' as const,
    detail: 'Traffic detected to an unapproved third-party AI endpoint outside the gateway.',
    recommended: 'Escalate to Security team for endpoint investigation.',
    status: 'Reviewing',
  },
  {
    id: 'ALT-2038',
    type: 'Unauthorized Data Export',
    model: 'Gemini Pro',
    employee: 'Priya Nair',
    risk: 'serious' as const,
    detail: 'Response contained a bulk export of records beyond the requested scope.',
    recommended: 'Quarantine response and confirm business justification with employee.',
    status: 'Resolved',
  },
];

const statusToBadge = { Open: 'critical', Reviewing: 'warning', Resolved: 'good' } as const;

export function RiskAlertCenterPage() {
  const [selectedId, setSelectedId] = useState(riskAlerts[0].id);
  const selected = riskAlerts.find((alert) => alert.id === selectedId)!;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Risk Alert Center</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review, investigate, and resolve AI-related security risks and governance alerts.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2 divide-y divide-slate-100">
          {riskAlerts.map((alert) => (
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
                <p className="text-sm font-semibold text-slate-900">{alert.type}</p>
                <p className="text-xs text-slate-400">
                  {alert.model} · Reported by {alert.employee} · {alert.id}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge status={alert.risk}>{alert.risk === 'critical' ? 'Critical' : 'High'}</Badge>
                <Badge status={statusToBadge[alert.status as keyof typeof statusToBadge]}>
                  {alert.status}
                </Badge>
              </div>
            </button>
          ))}
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Alert Details · {selected.id}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{selected.type}</h2>

          <div className="mt-3 flex items-center gap-2">
            <Badge status={selected.risk}>{selected.risk === 'critical' ? 'Critical' : 'High'}</Badge>
            <Badge status={statusToBadge[selected.status as keyof typeof statusToBadge]}>
              {selected.status}
            </Badge>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">Affected model</dt>
              <dd className="font-medium text-slate-700">{selected.model}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Employee</dt>
              <dd className="font-medium text-slate-700">{selected.employee}</dd>
            </div>
          </dl>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            What happened
          </p>
          <p className="mt-1 text-sm text-slate-600">{selected.detail}</p>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recommended action
          </p>
          <p className="mt-1 text-sm text-slate-600">{selected.recommended}</p>

          <div className="mt-5 flex gap-2">
            <Button className="w-auto">
              <Check size={15} />
              Resolve
            </Button>
            <Button variant="secondary" className="w-auto">
              <ArrowUpRight size={15} />
              Escalate
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
