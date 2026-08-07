import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { badRequest, notFound } from '../../../../../lib/server/auth';
import { requireSuperadmin } from '../../../../../lib/server/salon-context';
import { salonLifecycleActionSchema } from '@salonomia/validation';
import { recordAudit } from '../../../../../lib/server/audit';

const DETAIL_SELECT = {
  id: true,
  slug: true,
  name: true,
  status: true,
  city: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
  description: true,
  addressLine: true,
  phone: true,
  email: true,
  subdomain: true,
  customDomain: true,
  genderFocus: true,
} as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const superadminCheck = requireSuperadmin(req);
  if (superadminCheck instanceof NextResponse) return superadminCheck;

  const { id: salonId } = await params;

  const current = await prisma.salon.findUnique({ where: { id: salonId } });
  if (!current) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = salonLifecycleActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  const updated = await prisma.salon.update({
    where: { id: salonId },
    data: { status: 'SUSPENDED' },
    select: {
      ...DETAIL_SELECT,
      _count: { select: { memberships: { where: { status: 'ACTIVE' } } } },
    },
  });

  await recordAudit({
    actorUserId: superadminCheck.userId,
    action: 'salon.suspended',
    targetType: 'Salon',
    targetId: salonId,
    salonId,
    metadata: input.reason ? { reason: input.reason } : undefined,
  });

  const { _count, ...rest } = updated;
  return NextResponse.json({ ...rest, activeMembershipCount: _count.memberships });
}
