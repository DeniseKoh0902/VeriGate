// Relative path by default so local dev keeps using vite.config.ts's proxy
// to localhost:8001. Set VITE_API_BASE_URL to an absolute URL (e.g.
// https://verigate-api.onrender.com/api/v1) when frontend and backend are
// deployed on separate origins — a relative path would otherwise resolve
// against the frontend's own domain instead of the backend's.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
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
  // FormData bodies (file uploads) must NOT get an explicit Content-Type —
  // the browser sets `multipart/form-data; boundary=...` itself, and
  // overriding it here would drop the boundary and break parsing server-side.
  const isFormData = options?.body instanceof FormData;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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

// Fetches an authenticated file (e.g. a prompt attachment) as a blob URL —
// a plain <img src="/api/...">  can't carry the Authorization header, so the
// bytes have to come through fetch() instead. Callers must revokeObjectURL
// the result when done with it to avoid leaking memory.
export async function apiFetchObjectUrl(path: string): Promise<string> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized?.();
    }
    throw new Error('Unable to load file.');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
