import { apiFetch } from '@/lib/apiClient';
import type { AuthUser, LoginFormValues, MessageResponse, TokenResponse } from '@/types/auth.types';

export function login(values: LoginFormValues) {
  return apiFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function getMe() {
  return apiFetch<AuthUser>('/auth/me');
}

export function forgotPassword(email: string) {
  return apiFetch<MessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, newPassword: string) {
  return apiFetch<MessageResponse>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}
