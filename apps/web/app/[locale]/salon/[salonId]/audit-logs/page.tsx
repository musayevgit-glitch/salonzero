import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '../../../../../lib/server/jwt';
import { prisma } from '../../../../../lib/server/prisma';
import { SalonAuditLogsClient } from './AuditLogsClient';

// Authorization must be re-evaluated on every request — never served from a cache.
export const dynamic = 'force-dynamic';

/**
 * The audit journal is a platform-level surface: it is reachable only by superadmins, and the
 * salon-admin navigation no longer links to it. This server gate makes direct URL access fail
 * for SALON_ADMIN / SALON_MANAGER instead of relying on the hidden nav entry.
 *
 * The `isSuperadmin` claim in the token is not trusted on its own — the flag is re-read from
 * the database so revoking it takes effect immediately. The underlying
 * /api/salons/[salonId]/reports/audit-logs handler authorizes independently as well.
 */
export default async function SalonAuditLogsPage({
  params,
}: {
  params: Promise<{ locale: string; salonId: string }>;
}) {
  const { locale, salonId } = await params;

  const token = (await cookies()).get('token')?.value;
  if (!token) redirect(`/${locale}/login?returnTo=/salon/${salonId}`);

  let userId: string;
  try {
    userId = verifyJwt(token).sub;
  } catch {
    redirect(`/${locale}/login?returnTo=/salon/${salonId}`);
  }

  const superadmin = await prisma.user.findFirst({
    where: { id: userId, isSuperadmin: true, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!superadmin) redirect(`/${locale}/salon/${salonId}`);

  return <SalonAuditLogsClient />;
}
