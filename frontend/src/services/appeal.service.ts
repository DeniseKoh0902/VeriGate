import { apiFetch } from '@/lib/apiClient';
import type {
  Appeal,
  AppealAdmin,
  AppealCreateInput,
  AppealRequestInfoInput,
  AppealResolveInput,
  AppealRespondInput,
} from '@/types/appeal.types';

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

export function requestMoreInfo(id: string, input: AppealRequestInfoInput) {
  return apiFetch<AppealAdmin>(`/appeals/${id}/request-info`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function respondToInfoRequest(id: string, input: AppealRespondInput) {
  return apiFetch<Appeal>(`/appeals/${id}/respond`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
