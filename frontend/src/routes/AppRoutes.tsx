import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/Login';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPassword';
import { ResetPasswordPage } from '@/pages/auth/ResetPassword';
import { DashboardPage } from '@/pages/dashboard';
import { AiToolManagementPage } from '@/pages/aiToolManagement';
import { EmployeeManagementPage } from '@/pages/employeeManagement';
import { PolicyManagementPage } from '@/pages/policyManagement';
import { RiskAlertCenterPage } from '@/pages/riskAlertCenter';
import { AppealQueuePage } from '@/pages/appealQueue';
import { AuditLogsPage } from '@/pages/auditLogs';
import { AiPolicyRecommendationPage } from '@/pages/aiPolicyRecommendation';
import { GovernanceCopilotPage } from '@/pages/governanceCopilot';
import { AiWorkspacePage, AiToolRequestPage, MyComplianceOverviewPage } from '@/pages/workspace';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { EmployeeLayout } from '@/components/layout/EmployeeLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'COMPLIANCE']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/ai-tool-management" element={<AiToolManagementPage />} />
          <Route path="/employee-management" element={<EmployeeManagementPage />} />
          <Route path="/policy-management" element={<PolicyManagementPage />} />
          <Route path="/risk-alert-center" element={<RiskAlertCenterPage />} />
          <Route path="/appeal-queue" element={<AppealQueuePage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/ai-policy-recommendation" element={<AiPolicyRecommendationPage />} />
          <Route path="/governance-copilot" element={<GovernanceCopilotPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
        <Route element={<EmployeeLayout />}>
          <Route path="/workspace" element={<AiWorkspacePage />} />
          <Route path="/workspace/tool-request" element={<AiToolRequestPage />} />
          <Route path="/workspace/compliance-overview" element={<MyComplianceOverviewPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
