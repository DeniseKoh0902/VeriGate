import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as authService from '@/services/auth.service';
import { getAuthToken, setAuthToken, setUnauthorizedHandler } from '@/lib/apiClient';
import type { AuthUser } from '@/types/auth.types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (!getAuthToken()) {
      setIsLoading(false);
      return;
    }
    authService
      .getMe()
      .then(setUser)
      .catch(() => setAuthToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login({ email, password });
    setAuthToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
