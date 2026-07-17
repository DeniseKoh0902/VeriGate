export type ChatRole = 'user' | 'copilot';

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

export interface GovernanceCopilotRequest {
  messages: ChatMessage[];
}

export interface GovernanceCopilotResponse {
  message: ChatMessage;
}