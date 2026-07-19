import { apiFetch } from '@/lib/apiClient';
import type {
  AvailableModel,
  ChatSession,
  PromptHistoryItem,
  PromptSubmitInput,
  PromptSubmitResult,
} from '@/types/prompt.types';

export function submitPrompt(input: PromptSubmitInput) {
  return apiFetch<PromptSubmitResult>('/prompts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getAvailableModels() {
  return apiFetch<AvailableModel[]>('/prompts/available-models');
}

export function listChatSessions() {
  return apiFetch<ChatSession[]>('/prompts/sessions');
}

export function getSessionMessages(sessionId: string) {
  return apiFetch<PromptHistoryItem[]>(`/prompts/sessions/${sessionId}`);
}
