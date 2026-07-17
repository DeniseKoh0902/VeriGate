import { apiFetch } from '@/lib/apiClient';
import type {
  Policy,
  PolicyCreateInput,
  PolicyUpdateInput,
  SensitiveDataRule,
  SensitiveDataRuleCreateInput,
  SensitiveDataRuleUpdateInput,
} from '@/types/policy.types';

export function listPolicies() {
  return apiFetch<Policy[]>('/policies');
}

export function createPolicy(input: PolicyCreateInput) {
  return apiFetch<Policy>('/policies', { method: 'POST', body: JSON.stringify(input) });
}

export function updatePolicy(id: string, input: PolicyUpdateInput) {
  return apiFetch<Policy>(`/policies/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deletePolicy(id: string) {
  return apiFetch<void>(`/policies/${id}`, { method: 'DELETE' });
}

export function listSensitiveDataRules() {
  return apiFetch<SensitiveDataRule[]>('/policies/sensitive-data-rules');
}

export function createSensitiveDataRule(input: SensitiveDataRuleCreateInput) {
  return apiFetch<SensitiveDataRule>('/policies/sensitive-data-rules', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateSensitiveDataRule(id: string, input: SensitiveDataRuleUpdateInput) {
  return apiFetch<SensitiveDataRule>(`/policies/sensitive-data-rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteSensitiveDataRule(id: string) {
  return apiFetch<void>(`/policies/sensitive-data-rules/${id}`, { method: 'DELETE' });
}
