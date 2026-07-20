import { apiFetch } from '@/lib/apiClient';
import type {
  Policy,
  PolicyCreateInput,
  PolicyUpdateInput,
  SensitiveDataRule,
  SensitiveDataRuleCreateInput,
  SensitiveDataRuleUpdateInput,
  UseCasePolicy,
  UseCasePolicyCreateInput,
  UseCasePolicyUpdateInput,
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

export function listUseCasePolicies() {
  return apiFetch<UseCasePolicy[]>('/policies/use-case-policies');
}

export function createUseCasePolicy(input: UseCasePolicyCreateInput) {
  return apiFetch<UseCasePolicy>('/policies/use-case-policies', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateUseCasePolicy(id: string, input: UseCasePolicyUpdateInput) {
  return apiFetch<UseCasePolicy>(`/policies/use-case-policies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteUseCasePolicy(id: string) {
  return apiFetch<void>(`/policies/use-case-policies/${id}`, { method: 'DELETE' });
}
