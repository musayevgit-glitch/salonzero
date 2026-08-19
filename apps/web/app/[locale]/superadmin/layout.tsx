import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { verifyJwt } from '../../../lib/server/jwt';
import { prisma } from '../../../lib/server/prisma';
import { SuperadminShell } from './_components/SuperadminShell';

// Authorization must be re-evaluated on every request — never served from a cache.
export const dynamic = 'force-dynamic';

/**
 * Server-side gate for the whole /superadmin area.
 *
 * Nothing below this layout renders until the session cookie has been verified (signature +
 * expiry) AND the account is confirmed to still be an active superadmin *in the database* —
 * the `isSuperadmin` claim inside the token is not trusted on its own, so revoking the flag
 * or suspending the user takes effect immediately instead of at token expiry.
 *
 * Direct URL access hits this same path, and each /api/superadmin/* handler authorizes
 * independently, so the UI is never the only control.
 */
export default async function SuperadminLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get('token')?.value;
  if (!token) redirect('/login?returnTo=/superadmin');

  let userId: string;
  try {
    userId = verifyJwt(token).sub;
  } catch {
    redirect('/login?returnTo=/superadmin');
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, isSuperadmin: true, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!user) redirect('/account');

  return <SuperadminShell>{children}</SuperadminShell>;
}
