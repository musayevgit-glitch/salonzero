// Server-only fetch helper for the genuinely public, unauthenticated discovery/detail endpoints
// (Section 17.1/17.2). No cookies, no CSRF handling — those only matter for authenticated,
// state-changing requests (see lib/api-client.ts, which is client-only for that reason).

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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
  const url = new URL(`${API_URL}${path}`);
  if (opts?.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), opts?.noStore
    ? { cache: 'no-store' }
    : { next: { revalidate: 30 } },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Something went wrong.' }));
    throw new PublicApiError(res.status, body.message ?? 'Something went wrong.');
  }

  return res.json();
}
