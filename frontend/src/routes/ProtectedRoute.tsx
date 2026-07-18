import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { roleHomePath } from '@/lib/roleHome';
import type { Role } from '@/types/user.types';

interface ProtectedRouteProps {
  allowedRoles: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={roleHomePath[user.role]} replace />;
  }

  return <Outlet />;
}
