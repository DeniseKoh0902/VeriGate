export type ComplianceSourceType = 'PROMPT_BLOCK' | 'TOOL_REJECTION' | 'RISK_ALERT';
export type FlagStatus =
  | 'OPEN'
  | 'APPEAL_PENDING'
  | 'APPEAL_UNDER_REVIEW'
  | 'APPEAL_AWAITING_INFO'
  | 'UPHELD'
  | 'OVERTURNED';
export type ComplianceStanding = 'GOOD_STANDING' | 'NEEDS_ATTENTION' | 'UNDER_REVIEW';
export type AppealStatus = 'PENDING' | 'UNDER_REVIEW' | 'AWAITING_INFO' | 'RESOLVED';
export type AppealResolution = 'UPHELD' | 'OVERTURNED';

export interface ComplianceRiskFinding {
  category: string;
  riskLevel: string;
  note: string | null;
}

export interface ComplianceRecord {
  id: string;
  sourceType: ComplianceSourceType;
  title: string;
  policy: string | null;
  date: string;
  flagStatus: FlagStatus;
  appealable: boolean;
  appealId: string | null;
  appealStatus: AppealStatus | null;
  appealResolution: AppealResolution | null;
  additionalInfoRequest: string | null;
  employeeResponse: string | null;

  promptText: string | null;
  sanitizedText: string | null;
  riskFindings: ComplianceRiskFinding[];

  toolName: string | null;
  businessReason: string | null;
  department: string | null;
  rejectionReason: string | null;

  alertType: string | null;
  severity: string | null;
  description: string | null;
}

export interface ComplianceOverview {
  totalFlags: number;
  resolvedAppeals: number;
  standing: ComplianceStanding;
  records: ComplianceRecord[];
}
