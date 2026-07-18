import type { ComplianceRiskFinding } from '@/types/compliance.types';

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  employeeName: string | null;
  employeeEmail: string | null;
  department: string | null;
  aiToolName: string | null;
}

export interface AuditLogDetail extends AuditLog {
  // Prompt (and Appeal/RiskAlert logs that trace back to one)
  promptText: string | null;
  sanitizedText: string | null;
  responseText: string | null;
  riskFindings: ComplianceRiskFinding[];

  // Appeal
  justification: string | null;
  resolutionNotes: string | null;

  // RiskAlert / Policy
  alertType: string | null;
  severity: string | null;
  description: string | null;

  // AiTool
  vendor: string | null;
  version: string | null;
  riskTier: string | null;

  // Policy
  policyName: string | null;
  appliesToDepartment: string | null;

  // SensitiveDataRule
  category: string | null;
  riskLevel: string | null;
  ruleAction: string | null;

  // User (employee management target)
  targetRole: string | null;
  targetDepartment: string | null;
  targetIsActive: boolean | null;

  // AiToolRequest (and Appeal logs on a TOOL_REJECTION source)
  toolName: string | null;
  businessReason: string | null;

  // PolicyRecommendation
  recommendationTitle: string | null;
  recommendationRationale: string | null;
  recommendationDepartment: string | null;
  recommendationStatus: string | null;
  recommendationConfidenceScore: number | null;
}
