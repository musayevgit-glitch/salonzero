'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1] ?? '') : null;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Thin fetch wrapper: sends the session cookie, echoes the CSRF cookie as a header on
 * state-changing requests (docs/security/authentication.md), and normalizes error responses.
 * Never logs credentials/tokens.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const csrfToken = readCookie('csrfToken');
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
