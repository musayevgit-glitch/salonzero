import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/server/prisma';
import {
  getSalonContext,
  isSalonContextError,
} from '../../../../../../../lib/server/salon-context';
import { notFound } from '../../../../../../../lib/server/auth';
import { recordAudit } from '../../../../../../../lib/server/audit';

const SELECT = {
  id: true,
  fullName: true,
  bio: true,
  photoUrl: true,
  isActive: true,
  createdAt: true,
} as const;

const DETAIL_SELECT = { ...SELECT, updatedAt: true } as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string }> },
) {
  const { salonId, employeeId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  const current = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId },
  });
  if (!current) return notFound();

  const updated = await prisma.employeeProfile.update({
    where: { id: employeeId, salonId },
    data: { isActive: false },
    select: DETAIL_SELECT,
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'employee.deactivated',
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId,
  });

  return NextResponse.json(updated);
}
