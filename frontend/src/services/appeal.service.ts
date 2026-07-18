import { apiFetch } from '@/lib/apiClient';
import type { Appeal, AppealAdmin, AppealCreateInput, AppealResolveInput } from '@/types/appeal.types';

export function listMyAppeals() {
  return apiFetch<Appeal[]>('/appeals/mine');
}

export function createAppeal(input: AppealCreateInput) {
  return apiFetch<Appeal>('/appeals', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listAllAppeals() {
  return apiFetch<AppealAdmin[]>('/appeals');
}

export function resolveAppeal(id: string, input: AppealResolveInput) {
  return apiFetch<AppealAdmin>(`/appeals/${id}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
