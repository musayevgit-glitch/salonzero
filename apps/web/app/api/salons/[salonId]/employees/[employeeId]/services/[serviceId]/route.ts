import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../../lib/server/prisma';
import {
  getSalonContext,
  isSalonContextError,
} from '../../../../../../../../lib/server/salon-context';
import { notFound } from '../../../../../../../../lib/server/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string; serviceId: string }> },
) {
  const { salonId, employeeId, serviceId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  const emp = await prisma.employeeProfile.findUnique({
    where: { id: employeeId },
    select: { salonId: true },
  });
  if (!emp || emp.salonId !== salonId) return notFound();

  const row = await prisma.employeeService.findFirst({ where: { employeeId, serviceId } });
  if (!row) return notFound();

  await prisma.employeeService.delete({ where: { id: row.id } });
  return new NextResponse(null, { status: 204 });
}
