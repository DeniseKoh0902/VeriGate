import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/pages/auth/Login';
import { DashboardPage } from '@/pages/dashboard';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  );
}
