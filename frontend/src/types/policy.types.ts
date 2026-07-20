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

// BLOCKED tools are already an unconditional stop before any policy lookup
// runs, so only these two tiers are meaningful to configure here.
export type ToolTier = 'APPROVED' | 'RESTRICTED';

// The matrix that replaces the old "riskTier !== APPROVED -> reject
// everything" flat gate: what a tool *tier* is allowed to receive, broken
// down by data category (the same category vocabulary as SensitiveDataRule).
// A RESTRICTED tool defaults to blocking everything until a category is
// explicitly opted in here; an APPROVED tool defaults to allowing everything
// until a category is explicitly carved back out.
export interface ToolTierPolicy {
  id: string;
  toolTier: ToolTier;
  // null = applies to every tool in toolTier (class-level rule). Set =
  // applies to this one tool only, overriding the class-level rule for it.
  aiToolId: string | null;
  aiToolName: string | null;
  category: string;
  riskLevel: RiskLevel;
  action: RuleAction;
  isActive: boolean;
  createdById: string;
  createdAt: string;
}

export interface ToolTierPolicyCreateInput {
  toolTier: ToolTier;
  aiToolId?: string | null;
  category: string;
  riskLevel: RiskLevel;
  action: RuleAction;
}

export interface ToolTierPolicyUpdateInput {
  toolTier?: ToolTier;
  aiToolId?: string | null;
  category?: string;
  riskLevel?: RiskLevel;
  action?: RuleAction;
  isActive?: boolean;
}
