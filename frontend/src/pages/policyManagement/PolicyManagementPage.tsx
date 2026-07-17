import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import * as policyService from '@/services/policy.service';
import { useToast } from '@/context/ToastContext';
import { DEPARTMENTS } from '@/lib/departments';
import type {
  Policy,
  PolicyCreateInput,
  RiskLevel,
  RuleAction,
  SensitiveDataRule,
  SensitiveDataRuleCreateInput,
} from '@/types/policy.types';

const PAGE_SIZE = 5;

const riskLevelBadge: Record<RiskLevel, 'good' | 'warning' | 'serious' | 'critical'> = {
  LOW: 'good',
  MEDIUM: 'warning',
  HIGH: 'serious',
  CRITICAL: 'critical',
};

const actionBadge: Record<RuleAction, 'good' | 'warning' | 'serious' | 'critical'> = {
  ALLOW: 'good',
  WARN: 'warning',
  SANITIZE: 'serious',
  BLOCK: 'critical',
};

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const emptyPolicyForm: PolicyCreateInput = {
  name: '',
  description: '',
  severity: 'Medium',
  appliesToDepartment: 'All Departments',
};

const emptyRuleForm: SensitiveDataRuleCreateInput = {
  category: '',
  riskLevel: 'MEDIUM',
  action: 'WARN',
};

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

export function PolicyManagementPage() {
  const toast = useToast();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [rules, setRules] = useState<SensitiveDataRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [policyForm, setPolicyForm] = useState<PolicyCreateInput | null>(null);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);

  const [ruleForm, setRuleForm] = useState<SensitiveDataRuleCreateInput | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const [policyQuery, setPolicyQuery] = useState('');
  const [policyDepartmentFilter, setPolicyDepartmentFilter] = useState<string>('ALL');
  const [policySeverityFilter, setPolicySeverityFilter] = useState<string>('ALL');
  const [policyStatusFilter, setPolicyStatusFilter] = useState<StatusFilter>('ALL');
  const [policyPage, setPolicyPage] = useState(1);

  const [ruleQuery, setRuleQuery] = useState('');
  const [ruleRiskFilter, setRuleRiskFilter] = useState<RiskLevel | 'ALL'>('ALL');
  const [ruleActionFilter, setRuleActionFilter] = useState<RuleAction | 'ALL'>('ALL');
  const [rulePage, setRulePage] = useState(1);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [policyList, ruleList] = await Promise.all([
        policyService.listPolicies(),
        policyService.listSensitiveDataRules(),
      ]);
      setPolicies(policyList);
      setRules(ruleList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to load policy data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPolicies = useMemo(() => {
    const term = policyQuery.trim().toLowerCase();
    return policies.filter((policy) => {
      const matchesTerm =
        !term ||
        policy.name.toLowerCase().includes(term) ||
        (policy.appliesToDepartment ?? '').toLowerCase().includes(term);
      const matchesStatus =
        policyStatusFilter === 'ALL' ||
        (policyStatusFilter === 'ACTIVE' ? policy.isActive : !policy.isActive);
      const matchesDepartment =
        policyDepartmentFilter === 'ALL' || policy.appliesToDepartment === policyDepartmentFilter;
      const matchesSeverity =
        policySeverityFilter === 'ALL' || policy.severity === policySeverityFilter;
      return matchesTerm && matchesStatus && matchesDepartment && matchesSeverity;
    });
  }, [policies, policyQuery, policyStatusFilter, policyDepartmentFilter, policySeverityFilter]);

  const policyTotalPages = Math.max(1, Math.ceil(filteredPolicies.length / PAGE_SIZE));
  const paginatedPolicies = filteredPolicies.slice(
    (policyPage - 1) * PAGE_SIZE,
    policyPage * PAGE_SIZE,
  );

  useEffect(() => {
    if (policyPage > policyTotalPages) setPolicyPage(policyTotalPages);
  }, [policyPage, policyTotalPages]);

  const filteredRules = useMemo(() => {
    const term = ruleQuery.trim().toLowerCase();
    return rules.filter((rule) => {
      const matchesTerm = !term || rule.category.toLowerCase().includes(term);
      const matchesRisk = ruleRiskFilter === 'ALL' || rule.riskLevel === ruleRiskFilter;
      const matchesAction = ruleActionFilter === 'ALL' || rule.action === ruleActionFilter;
      return matchesTerm && matchesRisk && matchesAction;
    });
  }, [rules, ruleQuery, ruleRiskFilter, ruleActionFilter]);

  const ruleTotalPages = Math.max(1, Math.ceil(filteredRules.length / PAGE_SIZE));
  const paginatedRules = filteredRules.slice((rulePage - 1) * PAGE_SIZE, rulePage * PAGE_SIZE);

  useEffect(() => {
    if (rulePage > ruleTotalPages) setRulePage(ruleTotalPages);
  }, [rulePage, ruleTotalPages]);

  const startCreatePolicy = () => {
    setEditingPolicyId(null);
    setPolicyForm(emptyPolicyForm);
  };

  const startEditPolicy = (policy: Policy) => {
    setEditingPolicyId(policy.id);
    setPolicyForm({
      name: policy.name,
      description: policy.description ?? '',
      severity: policy.severity,
      appliesToDepartment: policy.appliesToDepartment ?? '',
    });
  };

  const savePolicy = async () => {
    if (!policyForm) return;
    try {
      if (editingPolicyId) {
        const updated = await policyService.updatePolicy(editingPolicyId, policyForm);
        setPolicies((prev) => prev.map((p) => (p.id === editingPolicyId ? updated : p)));
        toast.success('Policy updated successfully.');
      } else {
        const created = await policyService.createPolicy(policyForm);
        setPolicies((prev) => [created, ...prev]);
        toast.success('Policy created successfully.');
      }
      setPolicyForm(null);
      setEditingPolicyId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save policy.');
    }
  };

  const deletePolicy = async (id: string) => {
    if (!window.confirm('Delete this policy?')) return;
    try {
      await policyService.deletePolicy(id);
      setPolicies((prev) => prev.filter((p) => p.id !== id));
      toast.success('Policy deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to delete policy.');
    }
  };

  const startCreateRule = () => {
    setEditingRuleId(null);
    setRuleForm(emptyRuleForm);
  };

  const startEditRule = (rule: SensitiveDataRule) => {
    setEditingRuleId(rule.id);
    setRuleForm({ category: rule.category, riskLevel: rule.riskLevel, action: rule.action });
  };

  const saveRule = async () => {
    if (!ruleForm) return;
    try {
      if (editingRuleId) {
        const updated = await policyService.updateSensitiveDataRule(editingRuleId, ruleForm);
        setRules((prev) => prev.map((r) => (r.id === editingRuleId ? updated : r)));
        toast.success('Rule updated successfully.');
      } else {
        const created = await policyService.createSensitiveDataRule(ruleForm);
        setRules((prev) => [created, ...prev]);
        toast.success('Rule created successfully.');
      }
      setRuleForm(null);
      setEditingRuleId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save rule.');
    }
  };

  const deleteRule = async (id: string) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      await policyService.deleteSensitiveDataRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success('Rule deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to delete rule.');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Policy Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure organizational AI governance policies and sensitive data detection rules.
          </p>
        </div>
        <Button className="w-auto" onClick={startCreatePolicy}>
          <Plus size={16} />
          Create Policy
        </Button>
      </div>

      <Card className="mb-6">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">AI Governance Policies</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="w-72">
            <Input
              placeholder="Search by name or department"
              leftIcon={<Search size={16} />}
              value={policyQuery}
              onChange={(e) => {
                setPolicyQuery(e.target.value);
                setPolicyPage(1);
              }}
            />
          </div>
          <select
            className="rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700"
            value={policyDepartmentFilter}
            onChange={(e) => {
              setPolicyDepartmentFilter(e.target.value);
              setPolicyPage(1);
            }}
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENTS.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700"
            value={policySeverityFilter}
            onChange={(e) => {
              setPolicySeverityFilter(e.target.value);
              setPolicyPage(1);
            }}
          >
            <option value="ALL">All Risk Levels</option>
            {SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700"
            value={policyStatusFilter}
            onChange={(e) => {
              setPolicyStatusFilter(e.target.value as StatusFilter);
              setPolicyPage(1);
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {policyForm && (
          <div className="grid grid-cols-5 gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
            <Input
              placeholder="Policy name"
              value={policyForm.name}
              onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
            />
            <select
              className="rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700"
              value={policyForm.appliesToDepartment ?? 'All Departments'}
              onChange={(e) => setPolicyForm({ ...policyForm, appliesToDepartment: e.target.value })}
            >
              <option value="All Departments">All Departments</option>
              {DEPARTMENTS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700"
              value={policyForm.severity}
              onChange={(e) => setPolicyForm({ ...policyForm, severity: e.target.value })}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
            <Input
              placeholder="Description"
              value={policyForm.description ?? ''}
              onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
            />
            <div className="flex gap-2">
              <Button className="w-auto" onClick={savePolicy} disabled={!policyForm.name}>
                Save
              </Button>
              <Button variant="ghost" className="w-auto" onClick={() => setPolicyForm(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

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
            {!isLoading && paginatedPolicies.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                  {policies.length === 0
                    ? 'No policies yet — create one to get started.'
                    : 'No policies match your search/filter.'}
                </td>
              </tr>
            )}
            {paginatedPolicies.map((policy) => (
              <tr key={policy.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-900">{policy.name}</td>
                <td className="px-5 py-3 text-slate-500">{policy.appliesToDepartment ?? '—'}</td>
                <td className="px-5 py-3 text-slate-500">{policy.severity}</td>
                <td className="px-5 py-3">
                  <Badge status={policy.isActive ? 'good' : 'neutral'}>
                    {policy.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3 text-slate-400">
                    <button
                      aria-label="Edit policy"
                      className="hover:text-slate-700"
                      onClick={() => startEditPolicy(policy)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      aria-label="Delete policy"
                      className="hover:text-red-600"
                      onClick={() => deletePolicy(policy.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination
          currentPage={policyPage}
          totalPages={policyTotalPages}
          onPageChange={setPolicyPage}
          className="border-t border-slate-100"
        />
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Sensitive Data Rules</h2>
          <Button variant="secondary" className="w-auto" onClick={startCreateRule}>
            <Plus size={15} />
            Add Rule
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="w-72">
            <Input
              placeholder="Search by category"
              leftIcon={<Search size={16} />}
              value={ruleQuery}
              onChange={(e) => {
                setRuleQuery(e.target.value);
                setRulePage(1);
              }}
            />
          </div>
          <select
            className="rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700"
            value={ruleRiskFilter}
            onChange={(e) => {
              setRuleRiskFilter(e.target.value as RiskLevel | 'ALL');
              setRulePage(1);
            }}
          >
            <option value="ALL">All Risk Levels</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700"
            value={ruleActionFilter}
            onChange={(e) => {
              setRuleActionFilter(e.target.value as RuleAction | 'ALL');
              setRulePage(1);
            }}
          >
            <option value="ALL">All Actions</option>
            <option value="ALLOW">Allow</option>
            <option value="WARN">Warn</option>
            <option value="SANITIZE">Sanitize</option>
            <option value="BLOCK">Block</option>
          </select>
        </div>

        {ruleForm && (
          <div className="grid grid-cols-4 gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
            <Input
              placeholder="Category (e.g. Source Code)"
              value={ruleForm.category}
              onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}
            />
            <select
              className="rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700"
              value={ruleForm.riskLevel}
              onChange={(e) => setRuleForm({ ...ruleForm, riskLevel: e.target.value as RiskLevel })}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <select
              className="rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700"
              value={ruleForm.action}
              onChange={(e) => setRuleForm({ ...ruleForm, action: e.target.value as RuleAction })}
            >
              <option value="ALLOW">Allow</option>
              <option value="WARN">Warn</option>
              <option value="SANITIZE">Sanitize</option>
              <option value="BLOCK">Block</option>
            </select>
            <div className="flex gap-2">
              <Button className="w-auto" onClick={saveRule} disabled={!ruleForm.category}>
                Save
              </Button>
              <Button variant="ghost" className="w-auto" onClick={() => setRuleForm(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

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
            {!isLoading && paginatedRules.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">
                  {rules.length === 0
                    ? 'No sensitive data rules yet — add one to get started.'
                    : 'No rules match your search/filter.'}
                </td>
              </tr>
            )}
            {paginatedRules.map((rule) => (
              <tr key={rule.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-900">{rule.category}</td>
                <td className="px-5 py-3">
                  <Badge status={riskLevelBadge[rule.riskLevel]}>{titleCase(rule.riskLevel)}</Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge status={actionBadge[rule.action]}>{titleCase(rule.action)}</Badge>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3 text-slate-400">
                    <button
                      aria-label="Edit rule"
                      className="hover:text-slate-700"
                      onClick={() => startEditRule(rule)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      aria-label="Delete rule"
                      className="hover:text-red-600"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination
          currentPage={rulePage}
          totalPages={ruleTotalPages}
          onPageChange={setRulePage}
          className="border-t border-slate-100"
        />
      </Card>
    </div>
  );
}
