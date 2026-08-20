import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../../lib/server/salon-context';
import { ReservationStatus } from '@salonomia/database';

const REVENUE_STATUSES: ReservationStatus[] = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.CHECKED_IN,
  ReservationStatus.COMPLETED,
];

export async function GET(req: NextRequest) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { searchParams } = req.nextUrl;
  const from =
    searchParams.get('from') ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = searchParams.get('to') ?? new Date().toISOString().slice(0, 10);
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));

  const salons = await prisma.salon.findMany({
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      name: true,
      status: true,
      city: true,
      _count: {
        select: {
          employees: { where: { isActive: true } },
          services: { where: { isActive: true } },
        },
      },
    },
  });

  const totalSalons = await prisma.salon.count();

  const salonIds = salons.map((s) => s.id);

  const [reservationGroups, revenueGroups, cancelGroups, noShowGroups] = await Promise.all([
    prisma.reservation.groupBy({
      by: ['salonId'],
      where: { salonId: { in: salonIds }, startAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.reservation.groupBy({
      by: ['salonId', 'currency'],
      where: {
        salonId: { in: salonIds },
        status: { in: REVENUE_STATUSES },
        startAt: { gte: start, lte: end },
      },
      _sum: { priceAmount: true },
      _count: { id: true },
    }),
    prisma.reservation.groupBy({
      by: ['salonId'],
      where: {
        salonId: { in: salonIds },
        status: {
          in: [ReservationStatus.CANCELLED_BY_CUSTOMER, ReservationStatus.CANCELLED_BY_SALON],
        },
        startAt: { gte: start, lte: end },
      },
      _count: { id: true },
    }),
    prisma.reservation.groupBy({
      by: ['salonId'],
      where: {
        salonId: { in: salonIds },
        status: ReservationStatus.NO_SHOW,
        startAt: { gte: start, lte: end },
      },
      _count: { id: true },
    }),
  ]);

  const resByS = Object.fromEntries(reservationGroups.map((r) => [r.salonId, r._count.id]));
  const cancelByS = Object.fromEntries(cancelGroups.map((r) => [r.salonId, r._count.id]));
  const noShowByS = Object.fromEntries(noShowGroups.map((r) => [r.salonId, r._count.id]));
  const revenueByS: Record<string, { amount: number; currency: string; confirmedCount: number }> =
    {};
  for (const r of revenueGroups) {
    revenueByS[r.salonId] = {
      amount: r._sum.priceAmount ?? 0,
      currency: r.currency,
      confirmedCount: r._count.id,
    };
  }

  const rows = salons.map((s) => {
    const total = resByS[s.id] ?? 0;
    const cancelled = cancelByS[s.id] ?? 0;
    const noShows = noShowByS[s.id] ?? 0;
    const rev = revenueByS[s.id];
    return {
      salonId: s.id,
      salonName: s.name,
      status: s.status,
      city: s.city,
      activeStylists: s._count.employees,
      activeServices: s._count.services,
      totalReservations: total,
      cancelledCount: cancelled,
      noShowCount: noShows,
      cancellationRate: total > 0 ? cancelled / total : 0,
      noShowRate: total > 0 ? noShows / total : 0,
      revenue: rev?.amount ?? 0,
      currency: rev?.currency ?? 'AZN',
      confirmedCount: rev?.confirmedCount ?? 0,
    };
  });

  return NextResponse.json({ items: rows, total: totalSalons, page, pageSize, from, to });
}
