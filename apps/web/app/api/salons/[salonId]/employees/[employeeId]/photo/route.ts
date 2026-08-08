import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../../lib/server/salon-context';
import { notFound } from '../../../../../../../lib/server/auth';
import { recordAudit } from '../../../../../../../lib/server/audit';
import { handleImageUpload } from '../../../../../../../lib/server/upload';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string }> },
) {
  const { salonId, employeeId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  // Tenant isolation: verify employee belongs to this salon
  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId },
    select: { id: true },
  });
  if (!employee) return notFound();

  const result = await handleImageUpload(
    req,
    `employees/${employeeId}/profile`,
    5 * 1024 * 1024,
  );
  if (result instanceof NextResponse) return result;

  await prisma.employeeProfile.update({
    where: { id: employeeId },
    data: { photoUrl: result.url },
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'employee.photo_updated',
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId,
  });

  return NextResponse.json({ photoUrl: result.url });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string }> },
) {
  const { salonId, employeeId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  // Tenant isolation: verify employee belongs to this salon
  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId },
    select: { id: true },
  });
  if (!employee) return notFound();

  await prisma.employeeProfile.update({
    where: { id: employeeId },
    data: { photoUrl: null },
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'employee.photo_removed',
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId,
  });

  return new NextResponse(null, { status: 204 });
}
