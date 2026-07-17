import { apiFetch } from '@/lib/apiClient';
import type { PromptHistoryItem, PromptSubmitInput, PromptSubmitResult } from '@/types/prompt.types';

export function submitPrompt(input: PromptSubmitInput) {
  return apiFetch<PromptSubmitResult>('/prompts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getPromptHistory() {
  return apiFetch<PromptHistoryItem[]>('/prompts');
}
