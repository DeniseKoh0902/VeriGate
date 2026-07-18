import { apiFetch } from '@/lib/apiClient';
import type {
  ChatMessageHistoryItem,
  GovernanceCopilotRequest,
  GovernanceCopilotResponse,
  GovernanceCopilotSession,
} from '@/types/governanceCopilot.types';

export function askGovernanceCopilot(message: string, sessionId: string | null) {
  return apiFetch<GovernanceCopilotResponse>('/governance-copilot/chat', {
    method: 'POST',
    body: JSON.stringify({ message, sessionId } satisfies GovernanceCopilotRequest),
  });
}

export function listCopilotSessions() {
  return apiFetch<GovernanceCopilotSession[]>('/governance-copilot/sessions');
}

export function getCopilotSessionMessages(sessionId: string) {
  return apiFetch<ChatMessageHistoryItem[]>(`/governance-copilot/sessions/${sessionId}`);
}
