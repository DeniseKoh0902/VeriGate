import { Filter, RefreshCw, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Sparkline } from '@/components/ui/Sparkline';
import { DonutChart } from '@/components/ui/DonutChart';

const statTiles = [
  {
    label: 'Prompt Detection',
    value: '12.4k',
    unit: 'req / min',
    trend: [8, 9, 8.5, 10, 11, 10.5, 12, 12.4],
  },
  {
    label: 'AI Routing',
    value: '892',
    unit: 'avg ms latency',
    trend: [950, 930, 910, 905, 900, 895, 890, 892],
  },
  {
    label: 'Trust Eval',
    value: '99.8%',
    unit: 'compliance accuracy',
    trend: [99.2, 99.3, 99.4, 99.5, 99.6, 99.7, 99.7, 99.8],
  },
  {
    label: 'Policy Enforce',
    value: '4.2k',
    unit: 'blocks / day',
    trend: [3.2, 3.5, 3.6, 3.8, 3.9, 4.0, 4.1, 4.2],
  },
];

const trustScores = [
  { model: 'GPT-4 Turbo', tier: 'Approved Tier 1', score: 98, reliability: 'HIGH', bias: 'LOW' },
  { model: 'Claude 3 Opus', tier: 'Approved Tier 1', score: 96, reliability: 'HIGH', bias: 'NOMINAL' },
  { model: 'Gemini Pro', tier: 'Approved Tier 2', score: 89, reliability: 'MED', bias: 'NOMINAL' },
];

const deployments = [
  { model: 'Llama 3', note: 'Local', status: 'Provisioning' as const },
  { model: 'Mistral Large', note: null, status: 'Ready' as const },
];

const alerts = [
  {
    time: '14:23:01.044',
    type: 'PII Leakage Attempt',
    source: 'GPT-4 Turbo',
    risk: 'critical' as const,
    action: 'Intercepted',
  },
  {
    time: '14:22:45.192',
    type: 'Prompt Injection (Jailbreak)',
    source: 'Claude 3 Opus',
    risk: 'critical' as const,
    action: 'Blocked',
  },
  {
    time: '14:21:18.833',
    type: 'Shadow AI Access Detected',
    source: 'Unknown Endpoint',
    risk: 'serious' as const,
    action: 'Reviewing',
  },
  {
    time: '14:20:05.551',
    type: 'Unauthorized Data Export',
    source: 'Gemini Pro',
    risk: 'serious' as const,
    action: 'Quarantined',
  },
  {
    time: '14:18:59.002',
    type: 'Toxic Content Generation',
    source: 'GPT-3.5-Legacy',
    risk: 'serious' as const,
    action: 'Sanitized',
  },
];

function scoreColor(score: number) {
  if (score >= 95) return 'text-emerald-600';
  if (score >= 90) return 'text-blue-600';
  return 'text-orange-600';
}

export function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Control Plane Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time health telemetry and governance status across all integrated AI models.
          </p>
        </div>
        <a href="#help-center" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Help Center
        </a>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statTiles.map((tile) => (
          <Card key={tile.label} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {tile.label}
              </span>
              <Badge status="good">Healthy</Badge>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{tile.value}</p>
            <p className="text-xs text-slate-400">{tile.unit}</p>
            <Sparkline data={tile.trend} color="#0ca30c" className="mt-2 h-7 w-full" />
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Real-Time Risk Alert Feed</h2>
              <div className="flex items-center gap-3 text-slate-400">
                <button aria-label="Filter alerts" className="hover:text-slate-600">
                  <Filter size={16} />
                </button>
                <button aria-label="Refresh alerts" className="hover:text-slate-600">
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2 font-medium">Timestamp</th>
                  <th className="px-5 py-2 font-medium">Detection Type</th>
                  <th className="px-5 py-2 font-medium">Model Source</th>
                  <th className="px-5 py-2 font-medium">Risk Level</th>
                  <th className="px-5 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.time} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{alert.time}</td>
                    <td className="px-5 py-3 text-slate-700">{alert.type}</td>
                    <td className="px-5 py-3 text-slate-500">{alert.source}</td>
                    <td className="px-5 py-3">
                      <Badge status={alert.risk}>
                        {alert.risk === 'critical' ? 'Critical' : 'High'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-700">{alert.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <a
              href="#audit-log"
              className="flex items-center gap-1 border-t border-slate-100 px-5 py-3 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View Full Audit Log
              <ChevronRight size={14} />
            </a>
          </Card>

          <div className="grid grid-cols-2 gap-6">
            <Card className="p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Risk Distribution by Engine
              </h2>
              <DonutChart
                segments={[
                  { label: 'Jailbreaks', value: 42, color: '#e34948' },
                  { label: 'PII Privacy', value: 38, color: '#2a78d6' },
                  { label: 'Other', value: 20, color: '#64748b' },
                ]}
              />
            </Card>

            <Card className="bg-slate-900 p-5 text-white">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Compliance Score (Daily Average)
              </h2>
              <p className="text-3xl font-bold">99.42%</p>
              <p className="mt-1 text-sm font-medium text-emerald-400">
                +0.04% since yesterday
              </p>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                All systems are currently performing within the established governance
                parameters. No immediate intervention required.
              </p>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              AI Trust Scores Overview
            </h2>
            <div className="space-y-4">
              {trustScores.map((entry) => (
                <div key={entry.model} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{entry.model}</p>
                      <p className="text-xs text-slate-400">{entry.tier}</p>
                    </div>
                    <span className={`text-xl font-bold ${scoreColor(entry.score)}`}>
                      {entry.score}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    RELIABILITY: <span className="font-medium text-slate-500">{entry.reliability}</span>
                    {'  '}BIAS: <span className="font-medium text-slate-500">{entry.bias}</span>
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Model Deployment Status
            </h2>
            <div className="space-y-3">
              {deployments.map((deployment) => (
                <div key={deployment.model} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{deployment.model}</p>
                    {deployment.note && <p className="text-xs text-slate-400">{deployment.note}</p>}
                  </div>
                  <Badge status={deployment.status === 'Ready' ? 'good' : 'warning'}>
                    {deployment.status}
                  </Badge>
                </div>
              ))}
            </div>
            <Button variant="secondary" className="mt-4">
              Configure New Model
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
