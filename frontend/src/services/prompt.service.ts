import { apiFetch, apiFetchObjectUrl } from '@/lib/apiClient';
import type {
  AvailableModel,
  ChatSession,
  PromptHistoryItem,
  PromptSubmitInput,
  PromptSubmitResult,
} from '@/types/prompt.types';

export function submitPrompt(input: PromptSubmitInput) {
  const form = new FormData();
  form.append('aiToolName', input.aiToolName);
  form.append('promptText', input.promptText);
  if (input.sessionId) {
    form.append('sessionId', input.sessionId);
  }
  for (const file of input.files ?? []) {
    form.append('files', file);
  }

  return apiFetch<PromptSubmitResult>('/prompts', {
    method: 'POST',
    body: form,
  });
}

export function getAttachmentUrl(attachmentId: string) {
  return apiFetchObjectUrl(`/prompts/attachments/${attachmentId}`);
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
