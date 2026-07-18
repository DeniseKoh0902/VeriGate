export type AiToolRiskTier = 'APPROVED' | 'RESTRICTED' | 'BLOCKED';

export interface AiTool {
  id: string;
  name: string;
  vendor: string;
  version: string | null;
  endpoint: string | null;
  description: string | null;
  riskTier: AiToolRiskTier;
  isApproved: boolean;
  approvedById: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  overallScore: number | null;
}

export interface AiToolCreateInput {
  name: string;
  vendor: string;
  version?: string | null;
  endpoint?: string | null;
  description?: string | null;
  riskTier?: AiToolRiskTier;
}

export interface AiToolUpdateInput {
  vendor?: string | null;
  version?: string | null;
  endpoint?: string | null;
  description?: string | null;
  riskTier?: AiToolRiskTier;
}

export interface TrustEvaluationScores {
  securityScore: number;
  privacyScore: number;
  complianceScore: number;
  availabilityScore: number;
  explainabilityScore: number;
  orgPolicyScore: number;
}

export interface AiTrustEvaluationProposal extends TrustEvaluationScores {
  overallScore: number;
  justification: string;
}

export interface AiTrustEvaluation extends TrustEvaluationScores {
  id: string;
  aiToolId: string;
  overallScore: number;
  evaluatedById: string;
  evaluatedAt: string;
}
