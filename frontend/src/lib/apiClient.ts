const API_BASE = '/api/v1';
const TOKEN_STORAGE_KEY = 'verigate_token';

let authToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY);
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getAuthToken() {
  return authToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

function extractErrorMessage(body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown } | undefined;
    if (first && typeof first.msg === 'string') return first.msg;
  }
  return 'Request failed.';
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized?.();
    }
    const body = await response.json().catch(() => null);
    throw new Error(extractErrorMessage(body));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
