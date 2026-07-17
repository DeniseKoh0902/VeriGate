import { apiFetch } from '@/lib/apiClient';
import type {
  ChatMessage,
  GovernanceCopilotRequest,
  GovernanceCopilotResponse,
} from '@/types/governanceCopilot.types';

export async function askGovernanceCopilot(messages: ChatMessage[]) {
  const response = await apiFetch<GovernanceCopilotResponse>('/governance-copilot/chat', {
    method: 'POST',
    body: JSON.stringify({ messages } satisfies GovernanceCopilotRequest),
  });
  return response.message;
}