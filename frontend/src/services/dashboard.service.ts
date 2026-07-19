import { apiFetch } from '@/lib/apiClient';
import type { DashboardOverview } from '@/types/dashboard.types';

export function getDashboardOverview() {
  return apiFetch<DashboardOverview>('/dashboard/overview');
}
