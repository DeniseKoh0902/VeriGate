export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const DATA_CATEGORIES = [
  'PII',
  'Financial / Payment Data',
  'Health / Medical Data',
  'Credentials / API Keys',
  'Source Code / Intellectual Property',
  'Customer / Client Data',
  'Internal Confidential Documents',
  'None — Public / Non-sensitive Only',
] as const;

export type DataCategory = (typeof DATA_CATEGORIES)[number];

export interface AiToolRequest {
  id: string;
  userId: string;
  toolName: string;
  businessReason: string;
  department: string;
  dataCategories: string[];
  status: RequestStatus;
  rejectionReason: string | null;
  approvedToolId: string | null;
  reviewedById: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  slaDeadline: string | null;
}

export interface AiToolRequestCreateInput {
  toolName: string;
  businessReason: string;
  dataCategories: DataCategory[];
}
