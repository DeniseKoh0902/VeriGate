import { apiFetch } from '@/lib/apiClient';
import type { Appeal, AppealCreateInput } from '@/types/appeal.types';

export function listMyAppeals() {
  return apiFetch<Appeal[]>('/appeals/mine');
}

export function createAppeal(input: AppealCreateInput) {
  return apiFetch<Appeal>('/appeals', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
