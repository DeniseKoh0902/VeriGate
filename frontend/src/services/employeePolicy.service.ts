import { apiFetch } from '@/lib/apiClient';
import type { Policy, SensitiveDataRule, UseCasePolicy } from '@/types/policy.types';

export function listMyPolicies() {
  return apiFetch<Policy[]>('/my-policies');
}

export function listActiveSensitiveDataRules() {
  return apiFetch<SensitiveDataRule[]>('/my-policies/sensitive-data-rules');
}

export function listActiveUseCasePolicies() {
  return apiFetch<UseCasePolicy[]>('/my-policies/use-case-policies');
}
