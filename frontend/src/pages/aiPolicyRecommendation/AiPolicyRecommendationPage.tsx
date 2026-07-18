import { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Sparkles, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { useToast } from '@/context/ToastContext';
import * as policyRecommendationService from '@/services/policyRecommendation.service';
import type {
  PolicyRecommendation,
  RecommendationStatus,
} from '@/types/policyRecommendation.types';

const statusBadge: Record<RecommendationStatus, 'good' | 'warning' | 'neutral' | 'critical'> = {
  PENDING: 'warning',
  ACCEPTED: 'good',
  MODIFIED: 'neutral',
  REJECTED: 'critical',
};

const statusLabel: Record<RecommendationStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  MODIFIED: 'Modified',
  REJECTED: 'Rejected',
};

const statusFilters: (RecommendationStatus | 'All')[] = [
  'All',
  'PENDING',
  'ACCEPTED',
  'MODIFIED',
  'REJECTED',
];

function formatDate(date: string) {
  return new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function AiPolicyRecommendationPage() {
  const toast = useToast();
  const [recommendations, setRecommendations] = useState<PolicyRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RecommendationStatus | 'All'>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', rationale: '' });

  const loadRecommendations = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setRecommendations(await policyRecommendationService.listPolicyRecommendations());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load policy recommendations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  const sectionCounts = useMemo(() => {
    const counts: Record<RecommendationStatus | 'All', number> = {
      All: recommendations.length,
      PENDING: 0,
      ACCEPTED: 0,
      MODIFIED: 0,
      REJECTED: 0,
    };
    for (const rec of recommendations) {
      counts[rec.status] += 1;
    }
    return counts;
  }, [recommendations]);

  const filtered = useMemo(() => {
    return filter === 'All'
      ? recommendations
      : recommendations.filter((rec) => rec.status === filter);
  }, [recommendations, filter]);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const created = await policyRecommendationService.generatePolicyRecommendations();
      if (created.length > 0) {
        setRecommendations((prev) => [...created, ...prev]);
        toast.success(
          `Generated ${created.length} new recommendation${created.length > 1 ? 's' : ''}.`,
        );
      } else {
        toast.success("No new recommendations — current data doesn't support any new suggestions.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to generate recommendations.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = async (id: string) => {
    if (actingId) return;
    setActingId(id);
    try {
      const updated = await policyRecommendationService.acceptPolicyRecommendation(id);
      setRecommendations((prev) => prev.map((rec) => (rec.id === id ? updated : rec)));
      toast.success('Recommendation accepted — a new policy has been created.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to accept this recommendation.');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (actingId) return;
    setActingId(id);
    try {
      const updated = await policyRecommendationService.rejectPolicyRecommendation(id);
      setRecommendations((prev) => prev.map((rec) => (rec.id === id ? updated : rec)));
      toast.success('Recommendation rejected.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to reject this recommendation.');
    } finally {
      setActingId(null);
    }
  };

  const startEdit = (rec: PolicyRecommendation) => {
    setEditingId(rec.id);
    setEditForm({ title: rec.title, rationale: rec.rationale });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveModify = async (id: string) => {
    if (actingId || !editForm.title.trim() || !editForm.rationale.trim()) return;
    setActingId(id);
    try {
      const updated = await policyRecommendationService.modifyPolicyRecommendation(id, {
        title: editForm.title.trim(),
        rationale: editForm.rationale.trim(),
      });
      setRecommendations((prev) => prev.map((rec) => (rec.id === id ? updated : rec)));
      setEditingId(null);
      toast.success('Recommendation modified — a new policy has been created.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to modify this recommendation.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Policy Recommendation</h1>
          <p className="mt-1 text-sm text-slate-500">
            AI-assisted governance policy recommendations based on usage patterns, violations, and
            risk data.
          </p>
        </div>
        <Button className="w-auto" isLoading={isGenerating} onClick={handleGenerate}>
          <Sparkles size={15} />
          Generate Recommendations
        </Button>
      </div>

      {loadError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1">
        {statusFilters.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              filter === value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100',
            )}
          >
            {value === 'All' ? 'All' : statusLabel[value]} ({sectionCounts[value]})
          </button>
        ))}
      </div>

      {!isLoading && filtered.length === 0 && (
        <Card className="px-5 py-8 text-center text-sm text-slate-400">
          {recommendations.length === 0
            ? 'No policy recommendations yet — click "Generate Recommendations" to get started.'
            : 'No recommendations match this filter.'}
        </Card>
      )}

      <div className="space-y-4">
        {filtered.map((rec) => {
          const isEditing = editingId === rec.id;
          const isActing = actingId === rec.id;

          return (
            <Card key={rec.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-1 items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Sparkles size={16} />
                  </span>
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        />
                        <textarea
                          rows={3}
                          value={editForm.rationale}
                          onChange={(e) =>
                            setEditForm({ ...editForm, rationale: e.target.value })
                          }
                          className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="font-semibold text-slate-900">{rec.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{rec.rationale}</p>
                      </>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {rec.department && <Badge status="neutral">{rec.department}</Badge>}
                      <span className="text-xs text-slate-400">
                        {rec.confidenceScore}% confidence
                      </span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">
                        Generated {formatDate(rec.generatedAt)}
                      </span>
                      {rec.status !== 'PENDING' && (
                        <Badge status={statusBadge[rec.status]}>{statusLabel[rec.status]}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {rec.status === 'PENDING' && (
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                  {isEditing ? (
                    <>
                      <Button
                        className="w-auto"
                        isLoading={isActing}
                        onClick={() => handleSaveModify(rec.id)}
                        disabled={!editForm.title.trim() || !editForm.rationale.trim()}
                      >
                        <Check size={15} />
                        Save
                      </Button>
                      <Button variant="ghost" className="w-auto" onClick={cancelEdit}>
                        <X size={15} />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        className="w-auto"
                        isLoading={isActing}
                        onClick={() => handleAccept(rec.id)}
                      >
                        <Check size={15} />
                        Accept
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-auto"
                        disabled={isActing}
                        onClick={() => startEdit(rec)}
                      >
                        <Pencil size={15} />
                        Modify
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-auto"
                        isLoading={isActing}
                        onClick={() => handleReject(rec.id)}
                      >
                        <X size={15} />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
