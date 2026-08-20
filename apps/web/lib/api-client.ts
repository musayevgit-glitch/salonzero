'use client';

const API_URL =
  typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1] ?? '') : null;
}

/**
 * Pages where a 401 is an expected, non-actionable outcome (they probe /auth/me to decide
 * whether to bounce an already-signed-in user). Redirecting from these would loop.
 */
const AUTH_PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

/**
 * Session expiry handling: an expired or tampered JWT is rejected server-side with 401
 * (see lib/server/jwt.ts — tokens always carry an `exp` claim). When that happens mid-session
 * we send the user to the login page and preserve where they were so they land back there.
 */
function handleUnauthorized(): void {
  if (typeof window === 'undefined') return;
  const { pathname, search } = window.location;
  if (AUTH_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
  const returnTo = `${pathname}${search}`;
  window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const csrfToken = readCookie('csrfToken');
  const apiPath = path.startsWith('/api') ? path : `/api${path}`;
  const res = await fetch(`${API_URL}${apiPath}`, {
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
    if (res.status === 401) handleUnauthorized();
    throw new ApiError(res.status, body.message ?? 'Something went wrong. Please try again.', body);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// For multipart/form-data uploads — does NOT set Content-Type (browser sets it with boundary)
export async function apiFetchFormData<T = void>(
  path: string,
  init: RequestInit & { body?: FormData },
): Promise<T> {
  const csrfToken = readCookie('csrfToken');
  const apiPath = path.startsWith('/api') ? path : `/api${path}`;
  const res = await fetch(`${API_URL}${apiPath}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ message: 'Something went wrong. Please try again.' }));
    if (res.status === 401) handleUnauthorized();
    throw new ApiError(res.status, body.message ?? 'Something went wrong. Please try again.', body);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function putFile(url: string, file: File): Promise<void> {
  // Presigned S3/R2 URLs are cross-origin — no credentials or CSRF token.
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!res.ok) {
    throw new ApiError(res.status, 'Upload failed. Please try again.');
  }
}
