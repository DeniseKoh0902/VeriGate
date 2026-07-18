import { apiFetch } from '@/lib/apiClient';
import type { ComplianceOverview } from '@/types/compliance.types';

export function getComplianceOverview() {
  return apiFetch<ComplianceOverview>('/compliance/overview');
}
