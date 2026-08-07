import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../../../lib/server/salon-context';
import { notFound } from '../../../../../../../../lib/server/auth';
import { recordAudit } from '../../../../../../../../lib/server/audit';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string; entryId: string }> }
) {
  const { salonId, employeeId, entryId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId },
    select: { id: true },
  });
  if (!employee) return notFound();

  const entry = await prisma.timeOff.findFirst({
    where: { id: entryId, employeeId },
  });
  if (!entry) return notFound();

  await prisma.timeOff.delete({ where: { id: entryId, employeeId } });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'time_off.deleted',
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId,
    metadata: { startAt: entry.startAt.toISOString(), endAt: entry.endAt.toISOString() },
  });

  return NextResponse.json({ ok: true });
}
