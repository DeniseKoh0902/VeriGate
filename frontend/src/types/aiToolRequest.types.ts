export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AiToolRequest {
  id: string;
  userId: string;
  toolName: string;
  businessReason: string;
  department: string;
  status: RequestStatus;
  rejectionReason: string | null;
  approvedToolId: string | null;
  reviewedById: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface AiToolRequestCreateInput {
  toolName: string;
  businessReason: string;
  department: string;
}
