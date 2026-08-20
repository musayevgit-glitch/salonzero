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
  const salonId = searchParams.get('salonId') ?? '';
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));

  const empWhere = salonId ? { salonId } : {};

  const [employees, totalEmployees] = await Promise.all([
    prisma.employeeProfile.findMany({
      where: empWhere,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        fullName: true,
        isActive: true,
        photoUrl: true,
        salon: { select: { id: true, name: true } },
      },
    }),
    prisma.employeeProfile.count({ where: empWhere }),
  ]);

  const empIds = employees.map((e) => e.id);

  const [totalGroups, completedGroups, cancelGroups, noShowGroups, revenueGroups] =
    await Promise.all([
      prisma.reservation.groupBy({
        by: ['employeeId'],
        where: { employeeId: { in: empIds }, startAt: { gte: start, lte: end } },
        _count: { id: true },
      }),
      prisma.reservation.groupBy({
        by: ['employeeId'],
        where: {
          employeeId: { in: empIds },
          status: ReservationStatus.COMPLETED,
          startAt: { gte: start, lte: end },
        },
        _count: { id: true },
      }),
      prisma.reservation.groupBy({
        by: ['employeeId'],
        where: {
          employeeId: { in: empIds },
          status: {
            in: [ReservationStatus.CANCELLED_BY_CUSTOMER, ReservationStatus.CANCELLED_BY_SALON],
          },
          startAt: { gte: start, lte: end },
        },
        _count: { id: true },
      }),
      prisma.reservation.groupBy({
        by: ['employeeId'],
        where: {
          employeeId: { in: empIds },
          status: ReservationStatus.NO_SHOW,
          startAt: { gte: start, lte: end },
        },
        _count: { id: true },
      }),
      prisma.reservation.groupBy({
        by: ['employeeId', 'currency'],
        where: {
          employeeId: { in: empIds },
          status: { in: REVENUE_STATUSES },
          startAt: { gte: start, lte: end },
        },
        _sum: { priceAmount: true },
      }),
    ]);

  const byId = <T extends { employeeId: string }>(arr: T[]) =>
    Object.fromEntries(arr.map((r) => [r.employeeId, r]));

  const totalMap = byId(totalGroups);
  const completedMap = byId(completedGroups);
  const cancelMap = byId(cancelGroups);
  const noShowMap = byId(noShowGroups);
  const revenueMap: Record<string, { amount: number; currency: string }> = {};
  for (const r of revenueGroups) {
    revenueMap[r.employeeId] = { amount: r._sum.priceAmount ?? 0, currency: r.currency };
  }

  const rows = employees.map((e) => {
    const total = (totalMap[e.id] as { _count: { id: number } } | undefined)?._count.id ?? 0;
    const completed =
      (completedMap[e.id] as { _count: { id: number } } | undefined)?._count.id ?? 0;
    const cancelled = (cancelMap[e.id] as { _count: { id: number } } | undefined)?._count.id ?? 0;
    const noShows = (noShowMap[e.id] as { _count: { id: number } } | undefined)?._count.id ?? 0;
    const rev = revenueMap[e.id];
    return {
      employeeId: e.id,
      fullName: e.fullName,
      isActive: e.isActive,
      photoUrl: e.photoUrl,
      salonId: e.salon.id,
      salonName: e.salon.name,
      totalReservations: total,
      completedCount: completed,
      cancelledCount: cancelled,
      noShowCount: noShows,
      revenue: rev?.amount ?? 0,
      currency: rev?.currency ?? 'AZN',
    };
  });

  return NextResponse.json({ items: rows, total: totalEmployees, page, pageSize, from, to });
}
