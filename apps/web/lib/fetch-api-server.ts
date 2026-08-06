import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiServerError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Server-side fetch helper that forwards the session cookie so the API can
 * identify the logged-in user. Use only in Server Components (RSC) and Route Handlers.
 * Do NOT call from client components — use lib/api-client.ts there instead.
 */
export async function fetchApiServer<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('connect.sid');
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionCookie ? { Cookie: `${sessionCookie.name}=${sessionCookie.value}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Something went wrong.' }));
    throw new ApiServerError(res.status, body.message ?? 'Something went wrong.');
  }

  return res.json();
}

/**
 * Cheap server-side auth check for public pages: tries GET /auth/me and returns true if
 * the session is valid. Swallows all errors (401, network failures) and returns false.
 * Use this only to populate UI (e.g. "Account" vs "Log in" in the nav) — never to gate
 * access; real authorization still lives on the API.
 */
export async function getIsAuthenticated(): Promise<boolean> {
  try {
    await fetchApiServer('/auth/me', { cache: 'no-store' });
    return true;
  } catch {
    return false;
  }
}
