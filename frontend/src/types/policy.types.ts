export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RuleAction = 'ALLOW' | 'WARN' | 'BLOCK' | 'SANITIZE';

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
