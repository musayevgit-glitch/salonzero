import { cookies, headers } from 'next/headers';

// Server Components cannot call Route Handlers via relative URLs — Node's native fetch requires
// an absolute URL. We build one from the incoming request host so we always target the current
// deployment (same region on Vercel, localhost in dev).
async function getApiBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get('host') ?? 'localhost:3000';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  return `${proto}://${host}`;
}

export class ApiServerError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function buildApiServerFetchInit(
  init?: RequestInit,
  tokenCookie?: { name: string; value: string },
): RequestInit {
  return {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(tokenCookie ? { Cookie: `${tokenCookie.name}=${tokenCookie.value}` } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  };
}

/**
 * Server-side fetch helper that forwards the JWT cookie so Route Handlers can
 * identify the logged-in user. Use only in Server Components (RSC).
 * Do NOT call from client components — use lib/api-client.ts there instead.
 */
export async function fetchApiServer<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');
  const apiUrl = await getApiBaseUrl();

  // Server Components bypass Next.js rewrites, so we must use /api/* paths directly.
  const resolvedPath = path.startsWith('/api/') ? path : `/api${path}`;

  const res = await fetch(`${apiUrl}${resolvedPath}`, buildApiServerFetchInit(init, tokenCookie));

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Something went wrong.' }));
    throw new ApiServerError(res.status, body.message ?? 'Something went wrong.');
  }

  return res.json();
}

/**
 * Cheap server-side auth check: tries GET /api/auth/me and returns true if valid.
 * Use only for UI decoration (nav bar), never to gate access.
 */
export async function getIsAuthenticated(): Promise<boolean> {
  try {
    await fetchApiServer('/auth/me', { cache: 'no-store' });
    return true;
  } catch {
    return false;
  }
}
