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

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

/**
 * Uploads a file directly to a signed upload URL returned by an /upload-url endpoint. Bypasses
 * apiFetch's JSON assumptions (raw binary body, no JSON response) but still needs the CSRF header
 * since it's a state-changing request within the same authenticated session.
 */
export async function putFile(url: string, file: File): Promise<void> {
  const csrfToken = readCookie('csrfToken');
  const res = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': file.type,
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    body: file,
  });

  if (!res.ok) {
    throw new ApiError(res.status, 'Upload failed. Please try again.');
  }
}
