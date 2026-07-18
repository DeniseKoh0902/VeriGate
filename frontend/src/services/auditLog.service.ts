import { apiFetch } from '@/lib/apiClient';
import type { AuditLog, AuditLogDetail } from '@/types/auditLog.types';

export function listAuditLogs() {
  return apiFetch<AuditLog[]>('/audit-logs');
}

export function getAuditLogDetail(id: string) {
  return apiFetch<AuditLogDetail>(`/audit-logs/${id}`);
}
