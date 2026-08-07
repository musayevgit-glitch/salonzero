'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Fetch the CSRF token from the API (cross-origin safe — returned in JSON body, not a cookie).
async function fetchCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/csrf`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json() as { csrfToken?: string };
    return data.csrfToken ?? null;
  } catch {
    return null;
  }
}

/**
 * Thin fetch wrapper: sends the session cookie, fetches and echoes the CSRF token as a header on
 * state-changing requests (docs/security/authentication.md), and normalizes error responses.
 * Never logs credentials/tokens.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const isMutating = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  let csrfToken: string | null = null;
  if (isMutating) {
    csrfToken = await fetchCsrfToken();
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ message: 'Something went wrong. Please try again.' }));
    throw new ApiError(res.status, body.message ?? 'Something went wrong. Please try again.');
  }

  return res.json();
}
