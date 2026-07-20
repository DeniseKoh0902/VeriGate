import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Ban } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import * as employeePolicyService from '@/services/employeePolicy.service';
import type {
  Policy,
  RuleAction,
  SensitiveDataRule,
  RiskLevel,
  UseCasePolicy,
} from '@/types/policy.types';

type BadgeStatus = 'good' | 'warning' | 'serious' | 'critical' | 'neutral';

const riskLevelBadge: Record<RiskLevel, BadgeStatus> = {
  LOW: 'good',
  MEDIUM: 'warning',
  HIGH: 'serious',
  CRITICAL: 'critical',
};

const actionInfo: Record<RuleAction, { label: string; description: string; badge: BadgeStatus }> = {
  ALLOW: {
    label: 'Allowed',
    description: 'Not flagged — your prompt goes through as-is.',
    badge: 'good',
  },
  WARN: {
    label: 'Flagged',
    description: 'Logged as a warning, but still forwarded to the AI model.',
    badge: 'warning',
  },
  SANITIZE: {
    label: 'Auto-Redacted',
    description: 'The matched text is automatically masked before your prompt is sent.',
    badge: 'serious',
  },
  REQUIRE_APPROVAL: {
    label: 'Requires Approval',
    description: 'Your prompt is held until a governance admin reviews and approves it.',
    badge: 'serious',
  },
  BLOCK: {
    label: 'Blocked',
    description: 'Your prompt will not be sent — this is logged as a risk alert for review.',
    badge: 'critical',
  },
};

function policySeverityBadge(severity: string): BadgeStatus {
  switch (severity.toLowerCase()) {
    case 'low':
      return 'good';
    case 'medium':
      return 'warning';
    case 'high':
      return 'serious';
    case 'critical':
      return 'critical';
    default:
      return 'neutral';
  }
}

export function MyPoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [rules, setRules] = useState<SensitiveDataRule[]>([]);
  const [useCasePolicies, setUseCasePolicies] = useState<UseCasePolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [policyRows, ruleRows, useCasePolicyRows] = await Promise.all([
          employeePolicyService.listMyPolicies(),
          employeePolicyService.listActiveSensitiveDataRules(),
          employeePolicyService.listActiveUseCasePolicies(),
        ]);
        setPolicies(policyRows);
        setRules(ruleRows);
        setUseCasePolicies(useCasePolicyRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load policies.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Policies</h1>
        <p className="mt-1 text-sm text-slate-500">
          Governance policies and sensitive data rules that apply to you — so you know what's
          expected, and what happens if a prompt trips one of these.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <ShieldCheck size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">Governance Policies</h2>
          </div>

          {!isLoading && policies.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              No active policies apply to you right now.
            </p>
          )}

          <div className="divide-y divide-slate-100">
            {policies.map((policy) => (
              <div key={policy.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold text-slate-900">{policy.name}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge status={policySeverityBadge(policy.severity)}>{policy.severity}</Badge>
                    <Badge status="neutral">
                      {policy.appliesToDepartment ?? 'Organization-wide'}
                    </Badge>
                  </div>
                </div>
                {policy.description && (
                  <p className="mt-1.5 text-sm text-slate-500">{policy.description}</p>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-red-600" />
              <h2 className="font-semibold text-slate-900">Sensitive Data Rules</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              What VeriGate automatically watches for in your prompts, and what happens when it
              finds a match.
            </p>
          </div>

          {!isLoading && rules.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              No sensitive data rules are currently active.
            </p>
          )}

          <div className="divide-y divide-slate-100">
            {rules.map((rule) => {
              const info = actionInfo[rule.action];
              return (
                <div key={rule.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-semibold text-slate-900">{rule.category}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge status={riskLevelBadge[rule.riskLevel]}>{rule.riskLevel}</Badge>
                      <Badge status={info.badge}>{info.label}</Badge>
                    </div>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-500">{info.description}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Ban size={18} className="text-red-600" />
              <h2 className="font-semibold text-slate-900">Use Case Policies</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              What VeriGate restricts you from using AI to decide, regardless of what data is in
              your prompt — e.g. hiring, termination, or medical decisions.
            </p>
          </div>

          {!isLoading && useCasePolicies.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              No use case policies are currently active.
            </p>
          )}

          <div className="divide-y divide-slate-100">
            {useCasePolicies.map((policy) => {
              const info = actionInfo[policy.action];
              return (
                <div key={policy.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-semibold text-slate-900">{policy.useCase}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge status={riskLevelBadge[policy.riskLevel]}>{policy.riskLevel}</Badge>
                      <Badge status={info.badge}>{info.label}</Badge>
                    </div>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-500">{info.description}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
