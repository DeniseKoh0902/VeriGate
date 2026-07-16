import { Sparkles, Check, Pencil, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const recommendations = [
  {
    title: 'Restrict financial data prompts to Tier-1 approved models only',
    rationale:
      'Audit logs show 12 Finance department prompts routed to non-Tier-1 models in the last 30 days, 4 of which triggered sensitive data warnings.',
    department: 'Finance',
    confidence: 92,
  },
  {
    title: 'Lower the auto-block threshold for source code prompts to Medium risk',
    rationale:
      'Engineering has the highest volume of "Warn" outcomes for source-code sharing; incidents suggest the current threshold is too permissive.',
    department: 'Engineering',
    confidence: 81,
  },
  {
    title: 'Add Gemini Pro to the restricted list for HR workflows',
    rationale:
      'Gemini Pro trust score (89) sits below the HR department\'s required data-retention threshold for employee records.',
    department: 'HR',
    confidence: 74,
  },
];

export function AiPolicyRecommendationPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">AI Policy Recommendation</h1>
        <p className="mt-1 text-sm text-slate-500">
          AI-assisted governance policy recommendations based on usage patterns, violations, and risk data.
        </p>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec) => (
          <Card key={rec.title} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Sparkles size={16} />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{rec.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{rec.rationale}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge status="neutral">{rec.department}</Badge>
                    <span className="text-xs text-slate-400">{rec.confidence}% confidence</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
              <Button className="w-auto">
                <Check size={15} />
                Accept
              </Button>
              <Button variant="secondary" className="w-auto">
                <Pencil size={15} />
                Modify
              </Button>
              <Button variant="ghost" className="w-auto">
                <X size={15} />
                Reject
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
