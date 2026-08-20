import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../../../lib/server/salon-context';
import { notFound } from '../../../../../../lib/server/auth';
import { recordAudit } from '../../../../../../lib/server/audit';
import { handleImageUpload } from '../../../../../../lib/server/upload';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { employeeId } = await params;
  const employee = await prisma.employeeProfile.findUnique({
    where: { id: employeeId },
    select: { id: true, salonId: true },
  });
  if (!employee) return notFound();

  const result = await handleImageUpload(req, `employees/${employeeId}/profile`, 5 * 1024 * 1024);
  if (result instanceof NextResponse) return result;

  await prisma.employeeProfile.update({
    where: { id: employeeId },
    data: { photoUrl: result.url },
  });
  await recordAudit({
    actorUserId: check.userId,
    action: 'stylist.photo_updated',
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId: employee.salonId,
  });

  return NextResponse.json({ photoUrl: result.url });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { employeeId } = await params;
  const employee = await prisma.employeeProfile.findUnique({
    where: { id: employeeId },
    select: { id: true, salonId: true },
  });
  if (!employee) return notFound();

  await prisma.employeeProfile.update({ where: { id: employeeId }, data: { photoUrl: null } });
  await recordAudit({
    actorUserId: check.userId,
    action: 'stylist.photo_removed',
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId: employee.salonId,
  });

  return new NextResponse(null, { status: 204 });
}
