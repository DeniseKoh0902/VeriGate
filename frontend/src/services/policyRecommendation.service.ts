import { apiFetch } from '@/lib/apiClient';
import type {
  PolicyRecommendation,
  PolicyRecommendationModifyInput,
} from '@/types/policyRecommendation.types';

export function listPolicyRecommendations() {
  return apiFetch<PolicyRecommendation[]>('/policy-recommendations');
}

export function generatePolicyRecommendations() {
  return apiFetch<PolicyRecommendation[]>('/policy-recommendations/generate', {
    method: 'POST',
  });
}

export function acceptPolicyRecommendation(id: string) {
  return apiFetch<PolicyRecommendation>(`/policy-recommendations/${id}/accept`, {
    method: 'PATCH',
  });
}

export function modifyPolicyRecommendation(id: string, payload: PolicyRecommendationModifyInput) {
  return apiFetch<PolicyRecommendation>(`/policy-recommendations/${id}/modify`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function rejectPolicyRecommendation(id: string) {
  return apiFetch<PolicyRecommendation>(`/policy-recommendations/${id}/reject`, {
    method: 'PATCH',
  });
}
