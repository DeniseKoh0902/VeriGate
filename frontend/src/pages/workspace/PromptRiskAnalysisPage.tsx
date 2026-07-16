import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const detectedCategories = [
  { category: 'Personal Data (PII)', risk: 'critical' as const, note: 'Customer NRIC and phone number found in line 2.' },
  { category: 'Financial Data', risk: 'serious' as const, note: 'Account balance figures found in line 4.' },
];

const violatedPolicies = [
  'External LLM Usage Policy — customer identifiers must not be sent to external models.',
  'Finance Data Handling Policy — account figures require Tier-1 approved models only.',
];

export function PromptRiskAnalysisPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Prompt Risk Analysis</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review detected sensitive data, risk level, and violated policies before sending your prompt.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Submitted Prompt
          </h2>
          <p className="mt-2 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
            "Please draft a follow-up email to customer NRIC S1234567A at 9123-4567 regarding their
            account balance of $12,450.30 and next steps for the refund."
          </p>

          <h2 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Violated Policies
          </h2>
          <ul className="mt-2 space-y-2">
            {violatedPolicies.map((policy) => (
              <li key={policy} className="flex items-start gap-2 text-sm text-slate-600">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-orange-500" />
                {policy}
              </li>
            ))}
          </ul>

          <div className="mt-5 flex gap-2 border-t border-slate-100 pt-5">
            <Button variant="secondary" className="w-auto">
              Edit Prompt
            </Button>
            <Button variant="ghost" className="w-auto">
              Cancel Submission
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Risk Level
          </h2>
          <div className="mt-2">
            <Badge status="critical">Critical</Badge>
          </div>

          <h2 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Detected Sensitive Data
          </h2>
          <div className="mt-2 space-y-3">
            {detectedCategories.map((item) => (
              <div key={item.category} className="border-b border-slate-100 pb-3 last:border-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">{item.category}</p>
                  <Badge status={item.risk}>{item.risk === 'critical' ? 'Critical' : 'High'}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.note}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 rounded-lg bg-orange-50 p-3 text-xs text-orange-700">
            A sanitized version of this prompt is available — see Prompt Sanitization.
          </p>
        </Card>
      </div>
    </div>
  );
}
