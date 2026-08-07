import { cookies, headers } from 'next/headers';

// In production on Vercel, the NestJS API lives inside the same Next.js deployment
// served via pages/api/[...catchAll].ts. Server Components must call it using an
// absolute URL. We prefer NEXT_PUBLIC_API_URL when set (e.g. custom domain). Otherwise
// we fall back to constructing the URL from the incoming request's host header so we
// always hit the same Vercel deployment (no cross-region cold starts on a separate API).
async function getApiBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  // Inside a Server Component, headers() gives us the current request host.
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
  sessionCookie?: { name: string; value: string },
): RequestInit {
  return {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionCookie ? { Cookie: `${sessionCookie.name}=${sessionCookie.value}` } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  };
}

/**
 * Server-side fetch helper that forwards the session cookie so the API can
 * identify the logged-in user. Use only in Server Components (RSC) and Route Handlers.
 * Do NOT call from client components — use lib/api-client.ts there instead.
 */
export async function fetchApiServer<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  // Cookie name must match the 'name' option in configure-app.ts session middleware.
  const sessionCookie = cookieStore.get('sid');
  const apiUrl = await getApiBaseUrl();

  // Next.js rewrites (public/:path*, auth/:path* → /api/*) only apply to browser requests.
  // Server Components use Node's native fetch which bypasses rewrites entirely.
  // So we must add /api prefix ourselves so the request hits the NestJS catchAll handler
  // at pages/api/[...catchAll].ts directly.
  // Paths already starting with /api/ or /public/ are left unchanged.
  const resolvedPath = path.startsWith('/api/') || path.startsWith('/public/')
    ? path
    : `/api${path}`;

  const res = await fetch(`${apiUrl}${resolvedPath}`, buildApiServerFetchInit(init, sessionCookie));

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
