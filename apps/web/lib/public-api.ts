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

export async function fetchPublicApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    // Public discovery data changes rarely enough that a short revalidation window is a reasonable
    // default; not user-specific, so no cookies/credentials are ever sent here.
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Something went wrong.' }));
    throw new PublicApiError(res.status, body.message ?? 'Something went wrong.');
  }

  return res.json();
}
