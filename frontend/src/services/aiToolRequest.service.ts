import { apiFetch } from '@/lib/apiClient';
import type { AiToolRequest, AiToolRequestCreateInput } from '@/types/aiToolRequest.types';

export function listMyRequests() {
  return apiFetch<AiToolRequest[]>('/ai-tool-requests/mine');
}

export function createRequest(input: AiToolRequestCreateInput) {
  return apiFetch<AiToolRequest>('/ai-tool-requests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
