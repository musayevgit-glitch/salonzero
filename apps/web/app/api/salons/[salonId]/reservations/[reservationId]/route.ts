import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../lib/server/salon-context';
import { notFound } from '../../../../../../lib/server/auth';
import { computeStaffAvailableActions } from '../../../../../../lib/server/reservation-actions';

const STAFF_RESERVATION_SELECT = {
  id: true,
  status: true,
  startAt: true,
  endAt: true,
  priceAmount: true,
  currency: true,
  customerNote: true,
  guestName: true,
  createdAt: true,
  service: { select: { id: true, name: true } },
  employee: { select: { id: true, fullName: true } },
  customer: { select: { email: true } },
  statusHistory: {
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      reason: true,
      createdAt: true,
      changedByUser: { select: { fullName: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; reservationId: string }> },
) {
  const { salonId, reservationId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const where: Record<string, unknown> = { id: reservationId, salonId };

  if (ctx.role === 'SALON_MANAGER') {
    const employee = await prisma.employeeProfile.findFirst({
      where: { salonId, userId: ctx.userId },
      select: { id: true },
    });
    if (!employee) return notFound();
    where.employeeId = employee.id;
  }

  const row = await prisma.reservation.findFirst({
    where,
    select: STAFF_RESERVATION_SELECT,
  });

  if (!row) return notFound();

  const details = {
    ...row,
    availableActions: computeStaffAvailableActions(row.status, row.endAt, new Date()),
  };

  return NextResponse.json(details);
}
