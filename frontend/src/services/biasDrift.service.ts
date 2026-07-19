import { apiFetch } from '@/lib/apiClient';
import type { AiTrustEvaluation } from '@/types/aiTool.types';
import type { AiToolUsageScan } from '@/types/biasDrift.types';

// The block-rate/sensitive-data-rate scan has no manual trigger — it only
// runs on the weekly background job. This calls the trust-score
// re-evaluation instead, which is what the "Re-evaluate All" button in AI
// Tool Management actually needs.
export function reevaluateAllApprovedTools() {
  return apiFetch<AiTrustEvaluation[]>('/ai-tools/reevaluate-all', { method: 'POST' });
}

export function getUsageScans(toolId: string) {
  return apiFetch<AiToolUsageScan[]>(`/ai-tools/${toolId}/usage-scans`);
}
