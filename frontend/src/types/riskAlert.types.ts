import type {
  AppealResolution,
  AppealStatus,
  ComplianceRiskFinding,
} from '@/types/compliance.types';
import type { PromptAttachment } from '@/types/prompt.types';

export type RiskAlertStatus = 'OPEN' | 'RESOLVED' | 'ESCALATED';

export interface RiskAlertAdmin {
  id: string;
  alertType: string;
  severity: string;
  description: string | null;
  status: RiskAlertStatus;
  createdAt: string;
  employeeName: string;
  employeeEmail: string;
  aiToolName: string | null;
  promptText: string | null;
  riskFindings: ComplianceRiskFinding[];
  attachments: PromptAttachment[];
  appealStatus: AppealStatus | null;
  appealResolution: AppealResolution | null;
}
