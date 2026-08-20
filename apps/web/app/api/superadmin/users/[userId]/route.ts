import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../lib/server/auth';
import { recordAudit } from '../../../../../lib/server/audit';
import { z } from 'zod';

const updateUserSchema = z.object({
  isSuperadmin: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const superadminCheck = requireSuperadmin(req);
  if (superadminCheck instanceof NextResponse) return superadminCheck;

  const { userId } = await params;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid input.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Prevent superadmin from de-admining themselves by accident
  if (userId === superadminCheck.userId && data.isSuperadmin === false) {
    return badRequest('You cannot remove superadmin privilege from yourself.');
  }
  if (userId === superadminCheck.userId && data.status === 'SUSPENDED') {
    return badRequest('You cannot suspend your own account.');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      status: true,
      isSuperadmin: true,
      createdAt: true,
    },
  });

  await recordAudit({
    actorUserId: superadminCheck.userId,
    action: 'user.updated_by_admin',
    targetType: 'User',
    targetId: userId,
    metadata: { changedFields: Object.keys(data), newValue: data },
  });

  return NextResponse.json(updated);
}
