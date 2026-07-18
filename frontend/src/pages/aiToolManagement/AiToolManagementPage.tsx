import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Ban, Trash2, Sparkles, Search, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/context/ToastContext';
import * as aiToolService from '@/services/aiTool.service';
import type {
  AiTool,
  AiToolCreateInput,
  AiToolUpdateInput,
  AiTrustEvaluation,
  AiTrustEvaluationProposal,
  TrustEvaluationScores,
} from '@/types/aiTool.types';

const PAGE_SIZE = 6;

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

const criteriaLabels: { key: keyof TrustEvaluationScores; label: string }[] = [
  { key: 'securityScore', label: 'Security' },
  { key: 'privacyScore', label: 'Privacy' },
  { key: 'complianceScore', label: 'Compliance' },
  { key: 'availabilityScore', label: 'Availability' },
  { key: 'explainabilityScore', label: 'Explainability' },
  { key: 'orgPolicyScore', label: 'Org. Policies' },
];

const emptyToolForm: AiToolCreateInput = { name: '', vendor: '', version: '', description: '' };

type StatusFilter = 'ALL' | ToolStatus;

export function AiToolManagementPage() {
  const toast = useToast();
  const [tools, setTools] = useState<AiTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [toolForm, setToolForm] = useState<AiToolCreateInput | null>(null);
  const [editingToolId, setEditingToolId] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [latestEvaluation, setLatestEvaluation] = useState<AiTrustEvaluation | null>(null);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(false);
  const [proposal, setProposal] = useState<AiTrustEvaluationProposal | null>(null);
  const [evalDraft, setEvalDraft] = useState<TrustEvaluationScores | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);

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
    setProposal(null);
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
    setEditingToolId(null);
    setToolForm(emptyToolForm);
  };

  const startEditTool = (tool: AiTool) => {
    setEditingToolId(tool.id);
    setToolForm({
      name: tool.name,
      vendor: tool.vendor,
      version: tool.version ?? '',
      description: tool.description ?? '',
    });
  };

  const saveTool = async () => {
    if (!toolForm) return;
    try {
      if (editingToolId) {
        const updated = await aiToolService.updateAiTool(editingToolId, {
          vendor: toolForm.vendor,
          version: toolForm.version,
          description: toolForm.description,
        });
        setTools((prev) => prev.map((t) => (t.id === editingToolId ? updated : t)));
        toast.success('AI tool updated successfully.');
      } else {
        const created = await aiToolService.createAiTool(toolForm);
        setTools((prev) => [created, ...prev]);
        toast.success('AI tool registered successfully.');
      }
      setToolForm(null);
      setEditingToolId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save AI tool.');
    }
  };

  const disableTool = async (tool: AiTool) => {
    if (!window.confirm(`Disable "${tool.name}"? It will no longer be approved for use.`)) return;
    try {
      const updated: AiToolUpdateInput = { riskTier: 'BLOCKED' };
      const result = await aiToolService.updateAiTool(tool.id, updated);
      setTools((prev) => prev.map((t) => (t.id === tool.id ? result : t)));
      toast.success(`"${tool.name}" has been disabled.`);
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
      toast.success('AI tool removed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to remove AI tool.');
    }
  };

  const startEvaluation = async (tool: AiTool) => {
    setSelectedToolId(tool.id);
    setIsEvaluating(true);
    try {
      const result = await aiToolService.proposeTrustEvaluation(tool.id);
      setProposal(result);
      setEvalDraft({
        securityScore: result.securityScore,
        privacyScore: result.privacyScore,
        complianceScore: result.complianceScore,
        availabilityScore: result.availabilityScore,
        explainabilityScore: result.explainabilityScore,
        orgPolicyScore: result.orgPolicyScore,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to generate an AI evaluation.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const approveEvaluation = async () => {
    if (!selectedTool || !evalDraft) return;
    setIsSubmittingEvaluation(true);
    try {
      const result = await aiToolService.approveTrustEvaluation(selectedTool.id, evalDraft);
      setLatestEvaluation(result);
      setProposal(null);
      setEvalDraft(null);
      await loadTools();
      toast.success(`Trust evaluation approved — "${selectedTool.name}" is now Approved.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to approve evaluation.');
    } finally {
      setIsSubmittingEvaluation(false);
    }
  };

  const rejectEvaluation = () => {
    setProposal(null);
    setEvalDraft(null);
    toast.success('AI evaluation discarded.');
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
        <Button className="w-auto" onClick={startCreateTool}>
          <Plus size={16} />
          Register AI Tool
        </Button>
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
                disabled={!!editingToolId}
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
                        aria-label="Edit tool"
                        className="hover:text-slate-700"
                        onClick={() => startEditTool(tool)}
                      >
                        <Pencil size={15} />
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

              {!isEvaluating && evalDraft && proposal && (
                <>
                  <p className="mt-3 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">
                    {proposal.justification}
                  </p>
                  <div className="mt-4 space-y-3">
                    {criteriaLabels.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">{label}</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={evalDraft[key]}
                          onChange={(e) =>
                            setEvalDraft({
                              ...evalDraft,
                              [key]: Math.max(0, Math.min(100, Number(e.target.value))),
                            })
                          }
                          className="w-16 rounded-md border border-slate-300 px-2 py-1 text-right text-sm font-semibold text-slate-700"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                    <span className="text-xs font-medium text-slate-500">Overall Trust Score</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {Math.round(
                        criteriaLabels.reduce((sum, { key }) => sum + evalDraft[key], 0) /
                          criteriaLabels.length,
                      )}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      className="w-auto"
                      onClick={approveEvaluation}
                      isLoading={isSubmittingEvaluation}
                    >
                      <Check size={15} />
                      Approve
                    </Button>
                    <Button variant="secondary" className="w-auto" onClick={rejectEvaluation}>
                      <X size={15} />
                      Reject
                    </Button>
                  </div>
                </>
              )}

              {!isEvaluating && !evalDraft && isLoadingEvaluation && (
                <p className="mt-4 text-sm text-slate-400">Loading latest evaluation…</p>
              )}

              {!isEvaluating && !evalDraft && !isLoadingEvaluation && latestEvaluation && (
                <>
                  <div className="mt-4 space-y-3">
                    {criteriaLabels.map(({ key, label }) => (
                      <div key={key}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-semibold text-slate-700">
                            {latestEvaluation[key]}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full bg-blue-600"
                            style={{ width: `${latestEvaluation[key]}%` }}
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
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
