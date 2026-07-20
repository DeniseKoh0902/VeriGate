export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PromptStatus = 'FORWARDED' | 'BLOCKED' | 'SANITIZED' | 'PENDING_APPROVAL';

export interface RiskFinding {
  category: string;
  riskLevel: RiskLevel;
  note: string | null;
}

export interface SanitizationChange {
  original: string;
  replacement: string;
}

// Raw output from the backend's intent classifier for this prompt — present
// whenever at least one Use Case Policy was active and evaluated, regardless
// of whether it actually matched. Lets you see what Gemini returned (e.g. to
// debug why a prompt was or wasn't flagged) without backend console access.
export interface IntentClassification {
  category: string;
  confidence: number;
  matchedUseCase: string | null;
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
  intentClassification?: IntentClassification | null;
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

export interface AvailableModel {
  name: string;
  trustScore: number | null;
  recommended: boolean;
}
