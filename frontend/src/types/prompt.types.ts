export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PromptStatus = 'FORWARDED' | 'BLOCKED' | 'SANITIZED';

export interface RiskFinding {
  category: string;
  riskLevel: RiskLevel;
  note: string | null;
}

export interface SanitizationChange {
  original: string;
  replacement: string;
}

export interface PromptSubmitInput {
  aiToolName: string;
  promptText: string;
}

export interface PromptSubmitResult {
  promptId: string;
  status: PromptStatus;
  sanitizedText: string | null;
  riskFindings: RiskFinding[];
  sanitizationChanges: SanitizationChange[];
  responseText: string | null;
}

export interface PromptHistoryItem {
  promptId: string;
  promptText: string;
  status: PromptStatus;
  sanitizedText: string | null;
  riskFindings: RiskFinding[];
  responseText: string | null;
  createdAt: string;
}
