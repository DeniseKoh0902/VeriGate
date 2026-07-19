import { useEffect, useMemo, useState } from 'react';
import { Plus, Ban, Trash2, Sparkles, Search, Check, X, FileText, RadarIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import * as aiToolService from '@/services/aiTool.service';
import * as biasDriftService from '@/services/biasDrift.service';
import type {
  AiTool,
  AiToolCreateInput,
  AiToolUpdateInput,
  AiTrustEvaluation,
  TrustEvaluationScores,
} from '@/types/aiTool.types';
import type { AiToolUsageScan } from '@/types/biasDrift.types';

const PAGE_SIZE = 6;

type ScoreKey =
  | 'securityScore'
  | 'privacyScore'
  | 'complianceScore'
  | 'availabilityScore'
  | 'explainabilityScore'
  | 'orgPolicyScore';

type ReasonKey =
  | 'securityReason'
  | 'privacyReason'
  | 'complianceReason'
  | 'availabilityReason'
  | 'explainabilityReason'
  | 'orgPolicyReason';

type ToolStatus = 'Approved' | 'Pending Review' | 'Disabled';

function toolStatus(tool: AiTool): ToolStatus {
  if (tool.riskTier === 'BLOCKED') return 'Disabled';
  if (tool.riskTier === 'APPROVED') return 'Approved';
  return 'Pending Review';
}

const statusBadge: Record<ToolStatus, 'good' | 'warning' | 'critical'> = {
  Approved: 'good',
  'Pending Review': 'warning',
  Disabled: 'critical',
};

const criteriaLabels: {
  scoreKey: ScoreKey;
  reasonKey: ReasonKey;
  label: string;
}[] = [
  { scoreKey: 'securityScore', reasonKey: 'securityReason', label: 'Security' },
  { scoreKey: 'privacyScore', reasonKey: 'privacyReason', label: 'Privacy' },
  { scoreKey: 'complianceScore', reasonKey: 'complianceReason', label: 'Compliance' },
  { scoreKey: 'availabilityScore', reasonKey: 'availabilityReason', label: 'Availability' },
  { scoreKey: 'explainabilityScore', reasonKey: 'explainabilityReason', label: 'Explainability' },
  { scoreKey: 'orgPolicyScore', reasonKey: 'orgPolicyReason', label: 'Org. Policies' },
];

const emptyToolForm: AiToolCreateInput = { name: '', vendor: '', version: '', description: '' };

interface ToolDetailsDraft {
  vendor: string;
  version: string;
  description: string;
}

type StatusFilter = 'ALL' | ToolStatus;

function averageScore(scores: TrustEvaluationScores): number {
  const sum = criteriaLabels.reduce((total, { scoreKey }) => total + scores[scoreKey], 0);
  return Math.round(sum / criteriaLabels.length);
}

export function AiToolManagementPage() {
  const toast = useToast();
  const [tools, setTools] = useState<AiTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [toolForm, setToolForm] = useState<AiToolCreateInput | null>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [latestEvaluation, setLatestEvaluation] = useState<AiTrustEvaluation | null>(null);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);
  const [evalDraft, setEvalDraft] = useState<TrustEvaluationScores | null>(null);
  const [justificationDraft, setJustificationDraft] = useState('');
  const [detailsDraft, setDetailsDraft] = useState<ToolDetailsDraft | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);

  const [usageScans, setUsageScans] = useState<AiToolUsageScan[]>([]);
  const [isLoadingScans, setIsLoadingScans] = useState(false);
  const [isRunningScan, setIsRunningScan] = useState(false);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReasonDraft, setRejectionReasonDraft] = useState('');

  const selectedTool = tools.find((t) => t.id === selectedToolId) ?? null;

  const loadTools = async () => {
    setIsLoading(true);
    try {
      setTools(await aiToolService.listAiTools());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to load AI tools.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
  }, []);

  useEffect(() => {
    if (!selectedToolId) return;
    setEvalDraft(null);
    setLatestEvaluation(null);
    setIsLoadingEvaluation(true);
    aiToolService
      .getLatestTrustEvaluation(selectedToolId)
      .then(setLatestEvaluation)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Unable to load evaluation.'))
      .finally(() => setIsLoadingEvaluation(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToolId]);

  useEffect(() => {
    if (!selectedToolId) return;
    setUsageScans([]);
    setIsLoadingScans(true);
    biasDriftService
      .getUsageScans(selectedToolId)
      .then(setUsageScans)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Unable to load usage scans.'))
      .finally(() => setIsLoadingScans(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToolId]);

  const filteredTools = useMemo(() => {
    const term = query.trim().toLowerCase();
    return tools.filter((tool) => {
      const matchesTerm =
        !term ||
        tool.name.toLowerCase().includes(term) ||
        tool.vendor.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'ALL' || toolStatus(tool) === statusFilter;
      return matchesTerm && matchesStatus;
    });
  }, [tools, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTools.length / PAGE_SIZE));
  const paginatedTools = filteredTools.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const startCreateTool = () => {
    setToolForm(emptyToolForm);
  };

  const saveTool = async () => {
    if (!toolForm) return;
    try {
      const created = await aiToolService.createAiTool(toolForm);
      setTools((prev) => [created, ...prev]);
      toast.success('AI tool registered successfully.');
      setToolForm(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save AI tool.');
    }
  };

  const disableTool = async (tool: AiTool) => {
    if (!window.confirm(`Disable "${tool.name}"? It will no longer be approved for use.`)) return;
    const reason = window.prompt(
      `Why is "${tool.name}" being disabled? This is shared with everyone who currently has access.`,
    );
    if (reason === null || !reason.trim()) return;
    try {
      const updated: AiToolUpdateInput = { riskTier: 'BLOCKED', decisionNotes: reason.trim() };
      const result = await aiToolService.updateAiTool(tool.id, updated);
      setTools((prev) => prev.map((t) => (t.id === tool.id ? result : t)));
      toast.success(`"${tool.name}" has been disabled. Employees with access have been notified.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to disable AI tool.');
    }
  };

  const removeTool = async (tool: AiTool) => {
    if (!window.confirm(`Remove "${tool.name}" from the registry? This cannot be undone.`)) return;
    try {
      await aiToolService.deleteAiTool(tool.id);
      setTools((prev) => prev.filter((t) => t.id !== tool.id));
      if (selectedToolId === tool.id) setSelectedToolId(null);
      toast.success('AI tool removed. Any pending requesters have been notified.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to remove AI tool.');
    }
  };

  const reevaluateAllNow = async () => {
    setIsRunningScan(true);
    try {
      const results = await biasDriftService.reevaluateAllApprovedTools();
      toast.success(
        results.length > 0
          ? `Re-evaluated ${results.length} approved tool(s) from real usage. Governance notified of any regressions.`
          : 'No approved tools had usage in the last 7 days — nothing to re-evaluate.',
      );
      await loadTools();
      if (selectedToolId) {
        aiToolService
          .getLatestTrustEvaluation(selectedToolId)
          .then(setLatestEvaluation)
          .catch(() => {});
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to re-evaluate AI tools.');
    } finally {
      setIsRunningScan(false);
    }
  };

  const startEvaluation = async (tool: AiTool) => {
    setSelectedToolId(tool.id);
    setIsEvaluating(true);
    setIsRejecting(false);
    setRejectionReasonDraft('');
    try {
      const result = await aiToolService.proposeTrustEvaluation(tool.id);
      setEvalDraft({
        securityScore: result.securityScore,
        securityReason: result.securityReason,
        privacyScore: result.privacyScore,
        privacyReason: result.privacyReason,
        complianceScore: result.complianceScore,
        complianceReason: result.complianceReason,
        availabilityScore: result.availabilityScore,
        availabilityReason: result.availabilityReason,
        explainabilityScore: result.explainabilityScore,
        explainabilityReason: result.explainabilityReason,
        orgPolicyScore: result.orgPolicyScore,
        orgPolicyReason: result.orgPolicyReason,
      });
      setJustificationDraft(result.justification);
      setDetailsDraft({
        vendor: tool.vendor,
        version: tool.version ?? '',
        description: tool.description ?? '',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to generate an AI evaluation.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Opens the full report for editing — either the just-generated AI draft,
  // or (if none is pending) the tool's existing latest evaluation, so
  // Approve/Reject and description edits are always reachable from here.
  const openReport = (tool: AiTool) => {
    if (!evalDraft && latestEvaluation) {
      setEvalDraft({
        securityScore: latestEvaluation.securityScore,
        securityReason: latestEvaluation.securityReason ?? '',
        privacyScore: latestEvaluation.privacyScore,
        privacyReason: latestEvaluation.privacyReason ?? '',
        complianceScore: latestEvaluation.complianceScore,
        complianceReason: latestEvaluation.complianceReason ?? '',
        availabilityScore: latestEvaluation.availabilityScore,
        availabilityReason: latestEvaluation.availabilityReason ?? '',
        explainabilityScore: latestEvaluation.explainabilityScore,
        explainabilityReason: latestEvaluation.explainabilityReason ?? '',
        orgPolicyScore: latestEvaluation.orgPolicyScore,
        orgPolicyReason: latestEvaluation.orgPolicyReason ?? '',
      });
      setJustificationDraft(latestEvaluation.justification ?? '');
    }
    setDetailsDraft({
      vendor: tool.vendor,
      version: tool.version ?? '',
      description: tool.description ?? '',
    });
    setIsReportOpen(true);
  };

  const closeReport = () => {
    setIsReportOpen(false);
    setIsRejecting(false);
    setRejectionReasonDraft('');
  };

  // Persists tool details + evaluation scores/reasons to the database —
  // no decision, no new evaluation record, no notification to anyone.
  // Approve/Reject are the only actions that decide anything and notify;
  // Save just saves, same as its label says.
  const saveChanges = async () => {
    if (!selectedTool || !detailsDraft) return;
    setIsSubmittingEvaluation(true);
    try {
      const updatedTool = await aiToolService.updateAiTool(selectedTool.id, {
        vendor: detailsDraft.vendor,
        version: detailsDraft.version,
        description: detailsDraft.description,
      });
      setTools((prev) => prev.map((t) => (t.id === selectedTool.id ? updatedTool : t)));

      // Only an already-persisted evaluation can be edited in place — a
      // fresh AI proposal that's never been approved/rejected has no row
      // in the database yet, so there's nothing for this to update.
      if (evalDraft && latestEvaluation) {
        const result = await aiToolService.updateTrustEvaluation(selectedTool.id, {
          ...evalDraft,
          justification: justificationDraft,
        });
        setLatestEvaluation(result);
        // updateAiTool's response above still carried the pre-edit score —
        // the registry list needs the freshly recalculated one too.
        setTools((prev) =>
          prev.map((t) =>
            t.id === selectedTool.id ? { ...t, overallScore: result.overallScore } : t,
          ),
        );
      }

      toast.success('Changes saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save changes.');
    } finally {
      setIsSubmittingEvaluation(false);
    }
  };

  const submitDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedTool || !evalDraft || !detailsDraft) return;
    if (decision === 'REJECTED' && !rejectionReasonDraft.trim()) {
      toast.error('A rejection reason is required.');
      return;
    }
    setIsSubmittingEvaluation(true);
    try {
      const updatedTool = await aiToolService.updateAiTool(selectedTool.id, {
        vendor: detailsDraft.vendor,
        version: detailsDraft.version,
        description: detailsDraft.description,
      });
      setTools((prev) => prev.map((t) => (t.id === selectedTool.id ? updatedTool : t)));

      const result = await aiToolService.resolveTrustEvaluation(selectedTool.id, {
        ...evalDraft,
        justification: justificationDraft,
        decision,
        rejectionReason: decision === 'REJECTED' ? rejectionReasonDraft.trim() : null,
      });
      setLatestEvaluation(result);
      setEvalDraft(null);
      closeReport();
      await loadTools();
      toast.success(
        decision === 'APPROVED'
          ? `Trust evaluation approved — "${selectedTool.name}" is now Approved, and any pending requests for it have been notified.`
          : `Evaluation rejected — "${selectedTool.name}" is now Disabled, and any pending requests for it have been notified.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to submit the decision.');
    } finally {
      setIsSubmittingEvaluation(false);
    }
  };

  const cancelReport = () => {
    setEvalDraft(null);
    closeReport();
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Tool Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Register, approve, and evaluate AI tools available within the organization.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="w-auto"
            onClick={reevaluateAllNow}
            isLoading={isRunningScan}
          >
            <RadarIcon size={16} />
            Re-evaluate All
          </Button>
          <Button className="w-auto" onClick={startCreateTool}>
            <Plus size={16} />
            Register AI Tool
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Registered AI Tools</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="w-64">
              <Input
                placeholder="Search by model or vendor"
                leftIcon={<Search size={16} />}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-700"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>

          {toolForm && (
            <div className="grid grid-cols-5 gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
              <Input
                placeholder="Model name"
                value={toolForm.name}
                onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}
              />
              <Input
                placeholder="Vendor"
                value={toolForm.vendor}
                onChange={(e) => setToolForm({ ...toolForm, vendor: e.target.value })}
              />
              <Input
                placeholder="Version"
                value={toolForm.version ?? ''}
                onChange={(e) => setToolForm({ ...toolForm, version: e.target.value })}
              />
              <Input
                placeholder="Description"
                value={toolForm.description ?? ''}
                onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
              />
              <div className="flex gap-2">
                <Button
                  className="w-auto"
                  onClick={saveTool}
                  disabled={!toolForm.name || !toolForm.vendor}
                >
                  Save
                </Button>
                <Button variant="ghost" className="w-auto" onClick={() => setToolForm(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

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
              {!isLoading && paginatedTools.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                    {tools.length === 0
                      ? 'No AI tools registered yet — register one to get started.'
                      : 'No tools match your search/filter.'}
                  </td>
                </tr>
              )}
              {paginatedTools.map((tool) => (
                <tr
                  key={tool.id}
                  className={
                    'cursor-pointer border-t border-slate-100' +
                    (tool.id === selectedToolId ? ' bg-blue-50/60' : '')
                  }
                  onClick={() => setSelectedToolId(tool.id)}
                >
                  <td className="px-5 py-3 font-medium text-slate-900">{tool.name}</td>
                  <td className="px-5 py-3 text-slate-500">{tool.vendor}</td>
                  <td className="px-5 py-3 text-slate-500">{tool.version ?? '—'}</td>
                  <td className="px-5 py-3 font-semibold text-slate-700">
                    {tool.overallScore ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    <Badge status={statusBadge[toolStatus(tool)]}>{toolStatus(tool)}</Badge>
                  </td>
                  <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-3 text-slate-400">
                      <button
                        aria-label="Evaluate trust score"
                        className="hover:text-blue-600"
                        onClick={() => startEvaluation(tool)}
                      >
                        <Sparkles size={15} />
                      </button>
                      <button
                        aria-label="Disable tool"
                        className="hover:text-orange-600"
                        onClick={() => disableTool(tool)}
                      >
                        <Ban size={15} />
                      </button>
                      <button
                        aria-label="Remove tool"
                        className="hover:text-red-600"
                        onClick={() => removeTool(tool)}
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
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="border-t border-slate-100"
          />
        </Card>

        <Card className="p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            AI Trust Score Evaluation
          </h2>

          {!selectedTool && (
            <p className="mt-4 text-sm text-slate-400">
              Select a tool and click the sparkle icon to evaluate it.
            </p>
          )}

          {selectedTool && (
            <>
              <p className="mt-1 text-sm font-semibold text-slate-900">{selectedTool.name}</p>
              <p className="text-xs text-slate-400">Evaluated by AI Governance Copilot</p>

              {isEvaluating && (
                <p className="mt-4 text-sm text-slate-400">Analyzing tool with Gemini…</p>
              )}

              {!isEvaluating && evalDraft && (
                <>
                  <div className="mt-4 space-y-3">
                    {criteriaLabels.map(({ scoreKey, label }) => (
                      <div key={scoreKey}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-semibold text-slate-700">{evalDraft[scoreKey]}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full bg-blue-600"
                            style={{ width: `${evalDraft[scoreKey]}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                    <span className="text-xs font-medium text-slate-500">Overall Trust Score</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {averageScore(evalDraft)}
                    </span>
                  </div>

                  <Button className="mt-4" onClick={() => openReport(selectedTool)}>
                    <FileText size={15} />
                    View Full Report
                  </Button>
                </>
              )}

              {!isEvaluating && !evalDraft && isLoadingEvaluation && (
                <p className="mt-4 text-sm text-slate-400">Loading latest evaluation…</p>
              )}

              {!isEvaluating && !evalDraft && !isLoadingEvaluation && latestEvaluation && (
                <>
                  <div className="mt-4 space-y-3">
                    {criteriaLabels.map(({ scoreKey, label }) => (
                      <div key={scoreKey}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-semibold text-slate-700">
                            {latestEvaluation[scoreKey]}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full bg-blue-600"
                            style={{ width: `${latestEvaluation[scoreKey]}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                    <span className="text-xs font-medium text-slate-500">Overall Trust Score</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {latestEvaluation.overallScore}
                    </span>
                  </div>

                  <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={() => openReport(selectedTool)}
                  >
                    <FileText size={15} />
                    View Full Report
                  </Button>

                  <Button
                    variant="ghost"
                    className="mt-2"
                    onClick={() => startEvaluation(selectedTool)}
                  >
                    Re-evaluate with AI
                  </Button>
                </>
              )}

              {!isEvaluating && !evalDraft && !isLoadingEvaluation && !latestEvaluation && (
                <>
                  <p className="mt-4 text-sm text-slate-400">
                    This tool hasn't been evaluated yet.
                  </p>
                  <Button className="mt-3" onClick={() => startEvaluation(selectedTool)}>
                    <Sparkles size={15} />
                    Evaluate with AI
                  </Button>
                </>
              )}

              <div className="mt-6 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Usage Scan History
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Drift is measured from this tool's real logged prompts — block rate and
                  sensitive-data rate — not a re-scored opinion. Runs automatically every
                  Monday; "Re-evaluate All" above updates the trust score instead.
                </p>

                {isLoadingScans && (
                  <p className="mt-3 text-sm text-slate-400">Loading scans…</p>
                )}

                {!isLoadingScans && usageScans.length === 0 && (
                  <p className="mt-3 text-sm text-slate-400">
                    No usage scans yet — run one above.
                  </p>
                )}

                {!isLoadingScans && usageScans.length > 0 && (
                  <>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Latest scan —{' '}
                        {new Date(usageScans[0].scannedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        ({usageScans[0].triggeredBy === 'MANUAL' ? 'manual' : 'scheduled'})
                      </span>
                      {usageScans[0].isDriftFlagged && (
                        <Badge status="critical">Drift Flagged</Badge>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs text-slate-500">Block Rate</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {(usageScans[0].blockRate * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs text-slate-500">Sensitive-Data Rate</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {(usageScans[0].sensitiveDataMatchRate * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      {usageScans[0].promptCount} prompt(s) in the 7-day window.
                    </p>

                    {usageScans[0].aiSummary && (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                        {usageScans[0].aiSummary}
                      </div>
                    )}

                    {usageScans.length > 1 && (
                      <p className="mt-2 text-xs text-slate-400">
                        {usageScans.length - 1} earlier scan(s) on record.
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal
        isOpen={isReportOpen && !!selectedTool && !!evalDraft && !!detailsDraft}
        onClose={closeReport}
        title={`AI Trust Evaluation Report — ${selectedTool?.name ?? ''}`}
        description="Review the tool details and evaluation below, adjust anything as needed, then approve or reject."
        maxWidthClassName="max-w-3xl"
      >
        {evalDraft && detailsDraft && (
          <div className="space-y-5">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-900">Tool Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500">Vendor</label>
                  <Input
                    value={detailsDraft.vendor}
                    onChange={(e) => setDetailsDraft({ ...detailsDraft, vendor: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Version</label>
                  <Input
                    value={detailsDraft.version}
                    onChange={(e) => setDetailsDraft({ ...detailsDraft, version: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs font-medium text-slate-500">Description</label>
                <textarea
                  value={detailsDraft.description}
                  onChange={(e) =>
                    setDetailsDraft({ ...detailsDraft, description: e.target.value })
                  }
                  rows={2}
                  className="mt-1 w-full resize-none rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {criteriaLabels.map(({ scoreKey, reasonKey, label }) => (
              <div key={scoreKey} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-900">{label}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={evalDraft[scoreKey]}
                    onChange={(e) =>
                      setEvalDraft({
                        ...evalDraft,
                        [scoreKey]: Math.max(0, Math.min(100, Number(e.target.value))),
                      })
                    }
                    className="w-16 rounded-md border border-slate-300 px-2 py-1 text-right text-sm font-semibold text-slate-700"
                  />
                </div>
                <textarea
                  value={evalDraft[reasonKey]}
                  onChange={(e) => setEvalDraft({ ...evalDraft, [reasonKey]: e.target.value })}
                  rows={2}
                  className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
                />
              </div>
            ))}

            <div>
              <p className="text-sm font-semibold text-slate-900">Overall Justification</p>
              <textarea
                value={justificationDraft}
                onChange={(e) => setJustificationDraft(e.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
              <span className="text-xs font-medium text-slate-500">Overall Trust Score</span>
              <span className="text-lg font-bold text-emerald-600">{averageScore(evalDraft)}</span>
            </div>

            {isRejecting && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-red-800">
                  Reason for rejection (sent to the requester)
                </label>
                <textarea
                  autoFocus
                  value={rejectionReasonDraft}
                  onChange={(e) => setRejectionReasonDraft(e.target.value)}
                  rows={2}
                  placeholder="e.g. Vendor has no published security or compliance documentation."
                  className="mt-2 w-full resize-none rounded-md border border-red-200 bg-white px-2.5 py-2 text-sm text-slate-700 focus:border-red-400 focus:outline-none"
                />
              </div>
            )}

            <div className="flex gap-2">
              {!isRejecting ? (
                <>
                  <Button
                    className="w-auto"
                    onClick={() => submitDecision('APPROVED')}
                    isLoading={isSubmittingEvaluation}
                  >
                    <Check size={15} />
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-auto"
                    onClick={() => setIsRejecting(true)}
                  >
                    <X size={15} />
                    Reject
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-auto"
                    onClick={saveChanges}
                    isLoading={isSubmittingEvaluation}
                  >
                    Save
                  </Button>
                  <Button variant="ghost" className="w-auto" onClick={cancelReport}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    className="w-auto border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => submitDecision('REJECTED')}
                    isLoading={isSubmittingEvaluation}
                  >
                    Confirm Reject
                  </Button>
                  <Button variant="ghost" className="w-auto" onClick={() => setIsRejecting(false)}>
                    Back
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
