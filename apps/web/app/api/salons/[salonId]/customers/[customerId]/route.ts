import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../lib/server/salon-context';
import { notFound } from '../../../../../../lib/server/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; customerId: string }> },
) {
  const { salonId, customerId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  // Tenant isolation: verify this customer has at least one reservation with this salon
  const tenantCheck = await prisma.reservation.findFirst({
    where: { salonId, customerId },
    select: { id: true },
  });
  if (!tenantCheck) return notFound();

  const user = await prisma.user.findUnique({
    where: { id: customerId },
    select: { id: true, fullName: true, email: true },
  });
  if (!user) return notFound();

  const reservations = await prisma.reservation.findMany({
    where: { salonId, customerId },
    select: {
      id: true,
      status: true,
      startAt: true,
      endAt: true,
      priceAmount: true,
      currency: true,
      service: { select: { name: true } },
      employee: { select: { fullName: true } },
    },
    orderBy: { startAt: 'desc' },
    take: 20,
  });

  const completed = reservations.filter((r) => r.status === 'COMPLETED').length;
  const cancelled = reservations.filter(
    (r) => r.status === 'CANCELLED_BY_CUSTOMER' || r.status === 'CANCELLED_BY_SALON',
  ).length;
  const noShows = reservations.filter((r) => r.status === 'NO_SHOW').length;

  return NextResponse.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    stats: {
      totalVisits: completed,
      completed,
      cancelled,
      noShows,
      totalReservations: reservations.length,
    },
    reservations: reservations.map((r) => ({
      id: r.id,
      status: r.status,
      startAt: r.startAt.toISOString(),
      endAt: r.endAt.toISOString(),
      priceAmount: r.priceAmount,
      currency: r.currency,
      serviceName: r.service.name,
      employeeName: r.employee.fullName,
    })),
  });
}
