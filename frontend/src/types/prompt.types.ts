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
  sessionId?: string | null;
}

export interface PromptSubmitResult {
  promptId: string;
  sessionId: string;
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

export interface ChatSession {
  id: string;
  aiToolName: string;
  preview: string;
  lastMessageAt: string;
  createdAt: string;
}
