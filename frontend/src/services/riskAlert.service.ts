import { apiFetch } from '@/lib/apiClient';
import type { RiskAlertAdmin } from '@/types/riskAlert.types';

export function listAllRiskAlerts() {
  return apiFetch<RiskAlertAdmin[]>('/risk-alerts');
}

export function resolveRiskAlert(id: string) {
  return apiFetch<RiskAlertAdmin>(`/risk-alerts/${id}/resolve`, { method: 'PATCH' });
}

export function escalateRiskAlert(id: string) {
  return apiFetch<RiskAlertAdmin>(`/risk-alerts/${id}/escalate`, { method: 'PATCH' });
}
