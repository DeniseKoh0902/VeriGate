import type { LoginFormValues } from '@/types/auth.types';

export async function login(values: LoginFormValues) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? 'Unable to sign in. Please try again.');
  }

  return response.json();
}
