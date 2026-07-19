import { apiFetch } from '@/lib/apiClient';
import type { Policy, SensitiveDataRule } from '@/types/policy.types';

export function listMyPolicies() {
  return apiFetch<Policy[]>('/my-policies');
}

export function listActiveSensitiveDataRules() {
  return apiFetch<SensitiveDataRule[]>('/my-policies/sensitive-data-rules');
}
