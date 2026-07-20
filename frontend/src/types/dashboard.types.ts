import type { AiToolRiskTier } from '@/types/aiTool.types';
import type { RiskAlertStatus } from '@/types/riskAlert.types';

export interface StatTile {
  label: string;
  value: string;
  unit: string;
  trend: number[];
}

export interface DashboardAlert {
  id: string;
  createdAt: string;
  alertType: string;
  aiToolName: string | null;
  severity: string;
  status: RiskAlertStatus;
}

export interface RiskDistributionSegment {
  label: string;
  value: number;
}

export interface ComplianceScore {
  todayPct: number;
  deltaVsYesterday: number;
}

export interface TrustScoreSummary {
  toolName: string;
  riskTier: AiToolRiskTier;
  overallScore: number;
  securityScore: number;
  complianceScore: number;
}

export interface AiToolStatus {
  toolName: string;
  vendor: string;
  isApproved: boolean;
  riskTier: AiToolRiskTier;
}

export interface DepartmentUsage {
  department: string;
  promptCount: number;
  blockedCount: number;
  blockRatePct: number;
  activeUsers: number;
  topTool: string | null;
}

export interface DashboardOverview {
  statTiles: StatTile[];
  recentAlerts: DashboardAlert[];
  riskDistribution: RiskDistributionSegment[];
  complianceScore: ComplianceScore;
  trustScores: TrustScoreSummary[];
  recentAiTools: AiToolStatus[];
  usageByDepartment: DepartmentUsage[];
}
