import { apiFetch } from '@/lib/apiClient';
import type {
  AiTool,
  AiToolCreateInput,
  AiToolUpdateInput,
  AiTrustEvaluation,
  AiTrustEvaluationProposal,
  AiTrustEvaluationSubmit,
} from '@/types/aiTool.types';

export function listAiTools() {
  return apiFetch<AiTool[]>('/ai-tools');
}

export function createAiTool(input: AiToolCreateInput) {
  return apiFetch<AiTool>('/ai-tools', { method: 'POST', body: JSON.stringify(input) });
}

export function updateAiTool(id: string, input: AiToolUpdateInput) {
  return apiFetch<AiTool>(`/ai-tools/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteAiTool(id: string) {
  return apiFetch<void>(`/ai-tools/${id}`, { method: 'DELETE' });
}

export function proposeTrustEvaluation(toolId: string) {
  return apiFetch<AiTrustEvaluationProposal>(`/ai-tools/${toolId}/trust-evaluations/propose`, {
    method: 'POST',
  });
}

export function resolveTrustEvaluation(toolId: string, submission: AiTrustEvaluationSubmit) {
  return apiFetch<AiTrustEvaluation>(`/ai-tools/${toolId}/trust-evaluations`, {
    method: 'POST',
    body: JSON.stringify(submission),
  });
}

export function getLatestTrustEvaluation(toolId: string) {
  return apiFetch<AiTrustEvaluation | null>(`/ai-tools/${toolId}/trust-evaluations/latest`);
}
