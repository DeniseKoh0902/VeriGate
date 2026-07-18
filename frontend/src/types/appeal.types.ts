import type {
  AppealResolution,
  AppealStatus,
  ComplianceRiskFinding,
  ComplianceSourceType,
} from '@/types/compliance.types';

export interface Appeal {
  id: string;
  sourceType: ComplianceSourceType;
  sourceId: string;
  userId: string;
  justification: string;
  evidenceUrl: string | null;
  status: AppealStatus;
  resolution: AppealResolution | null;
  resolutionNotes: string | null;
  additionalInfoRequest: string | null;
  employeeResponse: string | null;
  reviewedById: string | null;
  slaDeadline: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AppealCreateInput {
  sourceType: ComplianceSourceType;
  sourceId: string;
  justification: string;
  evidenceUrl?: string | null;
}

export interface AppealAdmin {
  id: string;
  sourceType: ComplianceSourceType;
  sourceId: string;
  title: string;
  policy: string | null;
  employeeName: string;
  employeeEmail: string;
  justification: string;
  evidenceUrl: string | null;
  status: AppealStatus;
  resolution: AppealResolution | null;
  resolutionNotes: string | null;
  additionalInfoRequest: string | null;
  employeeResponse: string | null;
  slaDeadline: string | null;
  createdAt: string;
  resolvedAt: string | null;
  promptText: string | null;
  riskFindings: ComplianceRiskFinding[];
}

export interface AppealResolveInput {
  resolution: AppealResolution;
  resolutionNotes?: string | null;
}

export interface AppealRequestInfoInput {
  message: string;
}

export interface AppealRespondInput {
  response: string;
}
