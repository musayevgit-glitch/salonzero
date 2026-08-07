import { headers } from 'next/headers';

// Server-only fetch helper for public, unauthenticated discovery endpoints.
// No cookies — public routes don't require auth.

async function getBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get('host') ?? 'localhost:3000';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  return `${proto}://${host}`;
}

export class PublicApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function fetchPublicApi<T>(
  path: string,
  opts?: { params?: Record<string, string>; noStore?: boolean },
): Promise<T> {
  const base = await getBaseUrl();

  // Callers pass paths like /public/salons — Route Handlers live at /api/public/salons.
  const resolvedPath = path.startsWith('/api/') ? path : `/api${path}`;
  const url = new URL(`${base}${resolvedPath}`);

  if (opts?.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(
    url.toString(),
    opts?.noStore ? { cache: 'no-store' } : { next: { revalidate: 30 } },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Something went wrong.' }));
    throw new PublicApiError(res.status, body.message ?? 'Something went wrong.');
  }

  return res.json();
}
