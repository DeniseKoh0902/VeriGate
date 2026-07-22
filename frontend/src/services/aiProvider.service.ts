import { apiFetch } from '@/lib/apiClient';
import type { AiProvider, AiProviderConfigureInput } from '@/types/aiProvider.types';

export function listAiProviders() {
  return apiFetch<AiProvider[]>('/ai-providers');
}

export function configureAiProvider(input: AiProviderConfigureInput) {
  return apiFetch<AiProvider>('/ai-providers', { method: 'POST', body: JSON.stringify(input) });
}
