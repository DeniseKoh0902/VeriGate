// One row per AI vendor (OpenAI, Anthropic, Google...), not per model — an
// API key is a credential for the vendor, shared by every AiTool that
// vendor offers. hasApiKey/keyLastFour are the only signal ever returned
// about the key itself; the encrypted value never leaves the backend.
export interface AiProvider {
  id: string;
  vendor: string;
  apiBaseUrl: string | null;
  hasApiKey: boolean;
  keyLastFour: string | null;
  configuredById: string | null;
  configuredAt: string | null;
  createdAt: string;
  toolCount: number;
}

export interface AiProviderConfigureInput {
  vendor: string;
  apiKey: string;
  apiBaseUrl?: string | null;
}
