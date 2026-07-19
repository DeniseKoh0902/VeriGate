export type AiToolRiskTier = 'APPROVED' | 'RESTRICTED' | 'BLOCKED';
export type TrustEvaluationDecision = 'APPROVED' | 'REJECTED';

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
  decisionNotes: string | null;
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
  securityReason: string;
  privacyScore: number;
  privacyReason: string;
  complianceScore: number;
  complianceReason: string;
  availabilityScore: number;
  availabilityReason: string;
  explainabilityScore: number;
  explainabilityReason: string;
  orgPolicyScore: number;
  orgPolicyReason: string;
}

export interface AiTrustEvaluationProposal extends TrustEvaluationScores {
  overallScore: number;
  justification: string;
}

export interface AiTrustEvaluationSubmit extends TrustEvaluationScores {
  justification: string;
  decision: TrustEvaluationDecision;
  rejectionReason?: string | null;
}

export interface AiTrustEvaluation {
  id: string;
  aiToolId: string;
  securityScore: number;
  securityReason: string | null;
  privacyScore: number;
  privacyReason: string | null;
  complianceScore: number;
  complianceReason: string | null;
  availabilityScore: number;
  availabilityReason: string | null;
  explainabilityScore: number;
  explainabilityReason: string | null;
  orgPolicyScore: number;
  orgPolicyReason: string | null;
  overallScore: number;
  justification: string | null;
  evaluatedById: string;
  evaluatedAt: string;
}
