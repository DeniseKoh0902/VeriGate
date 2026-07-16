import { Plus, Pencil, Ban, Trash2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

type ToolStatus = 'Approved' | 'Pending Review' | 'Disabled';

const tools: {
  model: string;
  vendor: string;
  version: string;
  trustScore: number;
  status: ToolStatus;
}[] = [
  { model: 'GPT-4 Turbo', vendor: 'OpenAI', version: '2025-04', trustScore: 98, status: 'Approved' },
  { model: 'Claude 3 Opus', vendor: 'Anthropic', version: '3.0', trustScore: 96, status: 'Approved' },
  { model: 'Gemini Pro', vendor: 'Google', version: '1.5', trustScore: 89, status: 'Approved' },
  { model: 'Llama 3 (Local)', vendor: 'Meta', version: '3.0-70B', trustScore: 74, status: 'Pending Review' },
  { model: 'Mistral Large', vendor: 'Mistral AI', version: '2.1', trustScore: 91, status: 'Approved' },
  { model: 'GPT-3.5-Legacy', vendor: 'OpenAI', version: '0613', trustScore: 61, status: 'Disabled' },
];

const statusBadge: Record<ToolStatus, 'good' | 'warning' | 'critical'> = {
  Approved: 'good',
  'Pending Review': 'warning',
  Disabled: 'critical',
};

const criteria = [
  { label: 'Security', score: 96 },
  { label: 'Privacy', score: 92 },
  { label: 'Compliance', score: 98 },
  { label: 'Availability', score: 99 },
  { label: 'Explainability', score: 88 },
  { label: 'Org. Policies', score: 95 },
];

export function AiToolManagementPage() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Tool Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Register, approve, and evaluate AI tools available within the organization.
          </p>
        </div>
        <Button className="w-auto">
          <Plus size={16} />
          Register AI Tool
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Registered AI Tools</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2 font-medium">Model</th>
                <th className="px-5 py-2 font-medium">Vendor</th>
                <th className="px-5 py-2 font-medium">Version</th>
                <th className="px-5 py-2 font-medium">Trust Score</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool) => (
                <tr key={tool.model} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium text-slate-900">{tool.model}</td>
                  <td className="px-5 py-3 text-slate-500">{tool.vendor}</td>
                  <td className="px-5 py-3 text-slate-500">{tool.version}</td>
                  <td className="px-5 py-3 font-semibold text-slate-700">{tool.trustScore}</td>
                  <td className="px-5 py-3">
                    <Badge status={statusBadge[tool.status]}>{tool.status}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3 text-slate-400">
                      <button aria-label="Evaluate trust score" className="hover:text-blue-600">
                        <Sparkles size={15} />
                      </button>
                      <button aria-label="Edit tool" className="hover:text-slate-700">
                        <Pencil size={15} />
                      </button>
                      <button aria-label="Disable tool" className="hover:text-orange-600">
                        <Ban size={15} />
                      </button>
                      <button aria-label="Remove tool" className="hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            AI Trust Score Evaluation
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-900">GPT-4 Turbo</p>
          <p className="text-xs text-slate-400">Evaluated by AI Governance Copilot</p>

          <div className="mt-4 space-y-3">
            {criteria.map((criterion) => (
              <div key={criterion.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{criterion.label}</span>
                  <span className="font-semibold text-slate-700">{criterion.score}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full bg-blue-600"
                    style={{ width: `${criterion.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
            <span className="text-xs font-medium text-slate-500">Overall Trust Score</span>
            <span className="text-lg font-bold text-emerald-600">98</span>
          </div>

          <Button variant="secondary" className="mt-4">
            View Full Evaluation Report
          </Button>
        </Card>
      </div>
    </div>
  );
}
