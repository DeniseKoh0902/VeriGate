export type ChatRole = 'user' | 'copilot';

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

export interface ChatMessageHistoryItem extends ChatMessage {
  createdAt: string;
}

export interface GovernanceCopilotRequest {
  message: string;
  sessionId?: string | null;
}

export interface GovernanceCopilotResponse {
  message: ChatMessage;
  sessionId: string;
}

export interface GovernanceCopilotSession {
  id: string;
  preview: string;
  lastMessageAt: string;
  createdAt: string;
}
