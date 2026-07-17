import { apiFetch } from '@/lib/apiClient';
import type { LoginFormValues } from '@/types/auth.types';

export async function login(values: LoginFormValues) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(values),
  });
}
