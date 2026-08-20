import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../../lib/server/salon-context';
import { ReservationStatus } from '@salonomia/database';

const REVENUE_STATUSES: ReservationStatus[] = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.CHECKED_IN,
  ReservationStatus.COMPLETED,
];

function parseRange(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from =
    searchParams.get('from') ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = searchParams.get('to') ?? new Date().toISOString().slice(0, 10);
  return {
    from,
    to,
    start: new Date(`${from}T00:00:00.000Z`),
    end: new Date(`${to}T23:59:59.999Z`),
  };
}

export async function GET(req: NextRequest) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { from, to, start, end } = parseRange(req);

  const [
    totalSalons,
    activeSalons,
    totalStylists,
    activeStylists,
    totalServices,
    activeServices,
    totalReservations,
    byStatus,
    revenueResult,
    uniqueCustomers,
  ] = await Promise.all([
    prisma.salon.count(),
    prisma.salon.count({ where: { status: 'ACTIVE' } }),
    prisma.employeeProfile.count(),
    prisma.employeeProfile.count({ where: { isActive: true } }),
    prisma.service.count(),
    prisma.service.count({ where: { isActive: true } }),
    prisma.reservation.count({ where: { startAt: { gte: start, lte: end } } }),
    prisma.reservation.groupBy({
      by: ['status'],
      where: { startAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.reservation.aggregate({
      where: { status: { in: REVENUE_STATUSES }, startAt: { gte: start, lte: end } },
      _sum: { priceAmount: true },
    }),
    prisma.reservation.findMany({
      where: { startAt: { gte: start, lte: end } },
      distinct: ['customerId'],
      select: { customerId: true },
    }),
  ]);

  const byStatusMap = Object.fromEntries(byStatus.map((r) => [r.status, r._count.id]));

  const completed = byStatusMap[ReservationStatus.COMPLETED] ?? 0;
  const cancelled =
    (byStatusMap[ReservationStatus.CANCELLED_BY_CUSTOMER] ?? 0) +
    (byStatusMap[ReservationStatus.CANCELLED_BY_SALON] ?? 0);
  const noShows = byStatusMap[ReservationStatus.NO_SHOW] ?? 0;
  const confirmed = byStatusMap[ReservationStatus.CONFIRMED] ?? 0;

  return NextResponse.json({
    from,
    to,
    salons: { total: totalSalons, active: activeSalons },
    stylists: { total: totalStylists, active: activeStylists },
    services: { total: totalServices, active: activeServices },
    reservations: {
      total: totalReservations,
      completed,
      confirmed,
      cancelled,
      noShows,
      pending: byStatusMap[ReservationStatus.PENDING] ?? 0,
      cancellationRate: totalReservations > 0 ? cancelled / totalReservations : 0,
      completionRate: totalReservations > 0 ? completed / totalReservations : 0,
    },
    revenue: revenueResult._sum.priceAmount ?? 0,
    customers: { unique: uniqueCustomers.length },
  });
}
