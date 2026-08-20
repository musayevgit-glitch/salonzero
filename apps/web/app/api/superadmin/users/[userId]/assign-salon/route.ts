import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../lib/server/auth';
import { recordAudit } from '../../../../../../lib/server/audit';

const assignSalonSchema = z
  .object({
    salonId: z.string().uuid(),
    role: z.enum(['SALON_ADMIN', 'SALON_MANAGER']).default('SALON_ADMIN'),
  })
  .strict();

// POST /api/superadmin/users/[userId]/assign-salon
// Superadmin-only. Grants (or updates) a SalonMembership for the target user.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const superadminCheck = requireSuperadmin(req);
  if (superadminCheck instanceof NextResponse) return superadminCheck;

  const { userId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = assignSalonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid input.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { salonId, role } = parsed.data;

  const [user, salon] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true } }),
    prisma.salon.findFirst({
      where: { id: salonId, deletedAt: null },
      select: { id: true, name: true },
    }),
  ]);

  if (!user) return notFound();
  if (!salon) return badRequest('Salon not found.');
  if (user.status !== 'ACTIVE') {
    return badRequest('Cannot assign a salon role to a suspended user.');
  }

  // Unique on (userId, salonId) — upsert prevents duplicate memberships.
  const membership = await prisma.salonMembership.upsert({
    where: { userId_salonId: { userId, salonId } },
    create: {
      userId,
      salonId,
      role,
      status: 'ACTIVE',
      allowManageReservations: true,
    },
    update: {
      role,
      status: 'ACTIVE',
    },
    select: { id: true, userId: true, salonId: true, role: true, status: true },
  });

  await recordAudit({
    actorUserId: superadminCheck.userId,
    action: 'salon_membership.assigned_by_superadmin',
    targetType: 'SalonMembership',
    targetId: membership.id,
    salonId,
    metadata: { userId, role },
  });

  return NextResponse.json({ ...membership, salonName: salon.name });
}

// DELETE /api/superadmin/users/[userId]/assign-salon?salonId=...
// Revokes a salon membership.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const superadminCheck = requireSuperadmin(req);
  if (superadminCheck instanceof NextResponse) return superadminCheck;

  const { userId } = await params;
  const salonId = req.nextUrl.searchParams.get('salonId');
  if (!salonId) return badRequest('salonId is required.');

  const membership = await prisma.salonMembership.findUnique({
    where: { userId_salonId: { userId, salonId } },
    select: { id: true },
  });
  if (!membership) return notFound();

  await prisma.salonMembership.delete({ where: { id: membership.id } });

  await recordAudit({
    actorUserId: superadminCheck.userId,
    action: 'salon_membership.revoked_by_superadmin',
    targetType: 'SalonMembership',
    targetId: membership.id,
    salonId,
    metadata: { userId },
  });

  return NextResponse.json({ ok: true });
}
