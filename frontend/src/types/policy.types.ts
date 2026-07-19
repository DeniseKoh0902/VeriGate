export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RuleAction = 'ALLOW' | 'WARN' | 'BLOCK' | 'SANITIZE' | 'REQUIRE_APPROVAL';

export interface Policy {
  id: string;
  name: string;
  description: string | null;
  severity: string;
  appliesToDepartment: string | null;
  isActive: boolean;
  createdById: string;
  createdAt: string;
}

export interface PolicyCreateInput {
  name: string;
  description?: string | null;
  severity: string;
  appliesToDepartment?: string | null;
}

export interface PolicyUpdateInput {
  name?: string;
  description?: string | null;
  severity?: string;
  appliesToDepartment?: string | null;
  isActive?: boolean;
}

export interface SensitiveDataRule {
  id: string;
  category: string;
  riskLevel: RiskLevel;
  action: RuleAction;
  isActive: boolean;
  createdById: string;
  createdAt: string;
}

export interface SensitiveDataRuleCreateInput {
  category: string;
  riskLevel: RiskLevel;
  action: RuleAction;
}

export interface SensitiveDataRuleUpdateInput {
  category?: string;
  riskLevel?: RiskLevel;
  action?: RuleAction;
  isActive?: boolean;
}

// Governs what AI is allowed to *decide* (e.g. "Hiring Decisions" ->
// REQUIRE_APPROVAL), as distinct from SensitiveDataRule which governs what
// data it can see. useCase is a free-text label the admin defines — the
// backend's intent classifier is told, per request, to pick from whatever
// labels (and descriptions) are currently active, so there's no fixed
// vocabulary to keep in sync here.
export interface UseCasePolicy {
  id: string;
  useCase: string;
  description: string | null;
  riskLevel: RiskLevel;
  action: RuleAction;
  minConfidence: number;
  isActive: boolean;
  createdById: string;
  createdAt: string;
}

export interface UseCasePolicyCreateInput {
  useCase: string;
  description?: string | null;
  riskLevel: RiskLevel;
  action: RuleAction;
  minConfidence: number;
}

export interface UseCasePolicyUpdateInput {
  useCase?: string;
  description?: string | null;
  riskLevel?: RiskLevel;
  action?: RuleAction;
  minConfidence?: number;
  isActive?: boolean;
}
