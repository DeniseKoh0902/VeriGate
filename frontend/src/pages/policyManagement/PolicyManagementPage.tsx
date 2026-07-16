import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const policies = [
  {
    name: 'External LLM Usage Policy',
    departments: 'All Departments',
    riskLevel: 'High',
    active: true,
  },
  {
    name: 'Finance Data Handling Policy',
    departments: 'Finance',
    riskLevel: 'Critical',
    active: true,
  },
  {
    name: 'Source Code Assistant Policy',
    departments: 'Engineering',
    riskLevel: 'Medium',
    active: true,
  },
  {
    name: 'Legacy Model Deprecation Policy',
    departments: 'All Departments',
    riskLevel: 'Low',
    active: false,
  },
];

const sensitiveDataRules: {
  category: string;
  riskLevel: 'critical' | 'serious' | 'warning' | 'good';
  action: 'Block' | 'Sanitize' | 'Warn' | 'Allow';
}[] = [
  { category: 'Personal Data (PII)', riskLevel: 'critical', action: 'Sanitize' },
  { category: 'Financial Data', riskLevel: 'critical', action: 'Block' },
  { category: 'Source Code', riskLevel: 'serious', action: 'Warn' },
  { category: 'API Keys & Credentials', riskLevel: 'critical', action: 'Block' },
  { category: 'Confidential Documents', riskLevel: 'serious', action: 'Sanitize' },
];

const actionBadge: Record<string, 'good' | 'warning' | 'serious' | 'critical'> = {
  Allow: 'good',
  Warn: 'warning',
  Sanitize: 'serious',
  Block: 'critical',
};

export function PolicyManagementPage() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Policy Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure organizational AI governance policies and sensitive data detection rules.
          </p>
        </div>
        <Button className="w-auto">
          <Plus size={16} />
          Create Policy
        </Button>
      </div>

      <Card className="mb-6">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">AI Governance Policies</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2 font-medium">Policy Name</th>
              <th className="px-5 py-2 font-medium">Applies To</th>
              <th className="px-5 py-2 font-medium">Risk Level</th>
              <th className="px-5 py-2 font-medium">Status</th>
              <th className="px-5 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.name} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-900">{policy.name}</td>
                <td className="px-5 py-3 text-slate-500">{policy.departments}</td>
                <td className="px-5 py-3 text-slate-500">{policy.riskLevel}</td>
                <td className="px-5 py-3">
                  <Badge status={policy.active ? 'good' : 'neutral'}>
                    {policy.active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3 text-slate-400">
                    <button aria-label="Edit policy" className="hover:text-slate-700">
                      <Pencil size={15} />
                    </button>
                    <button aria-label="Delete policy" className="hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Sensitive Data Rules</h2>
          <Button variant="secondary" className="w-auto">
            <Plus size={15} />
            Add Rule
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2 font-medium">Category</th>
              <th className="px-5 py-2 font-medium">Risk Level</th>
              <th className="px-5 py-2 font-medium">Action</th>
              <th className="px-5 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sensitiveDataRules.map((rule) => (
              <tr key={rule.category} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-900">{rule.category}</td>
                <td className="px-5 py-3">
                  <Badge status={rule.riskLevel}>
                    {rule.riskLevel === 'serious' ? 'High' : rule.riskLevel === 'critical' ? 'Critical' : 'Medium'}
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge status={actionBadge[rule.action]}>{rule.action}</Badge>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3 text-slate-400">
                    <button aria-label="Edit rule" className="hover:text-slate-700">
                      <Pencil size={15} />
                    </button>
                    <button aria-label="Delete rule" className="hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
