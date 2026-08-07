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
  const from = searchParams.get('from') ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = searchParams.get('to') ?? new Date().toISOString().slice(0, 10);
  const salonId = searchParams.get('salonId') ?? '';
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));

  const svcWhere = salonId ? { salonId } : {};

  const [services, totalServices] = await Promise.all([
    prisma.service.findMany({
      where: svcWhere,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        priceAmount: true,
        currency: true,
        durationMinutes: true,
        isActive: true,
        salon: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        _count: { select: { employees: true } },
      },
    }),
    prisma.service.count({ where: svcWhere }),
  ]);

  const svcIds = services.map((s) => s.id);

  const [totalGroups, completedGroups, cancelGroups, revenueGroups] = await Promise.all([
    prisma.reservation.groupBy({
      by: ['serviceId'],
      where: { serviceId: { in: svcIds }, startAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.reservation.groupBy({
      by: ['serviceId'],
      where: { serviceId: { in: svcIds }, status: ReservationStatus.COMPLETED, startAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.reservation.groupBy({
      by: ['serviceId'],
      where: {
        serviceId: { in: svcIds },
        status: { in: [ReservationStatus.CANCELLED_BY_CUSTOMER, ReservationStatus.CANCELLED_BY_SALON] },
        startAt: { gte: start, lte: end },
      },
      _count: { id: true },
    }),
    prisma.reservation.groupBy({
      by: ['serviceId', 'currency'],
      where: { serviceId: { in: svcIds }, status: { in: REVENUE_STATUSES }, startAt: { gte: start, lte: end } },
      _sum: { priceAmount: true },
    }),
  ]);

  const byId = <T extends { serviceId: string }>(arr: T[]) =>
    Object.fromEntries(arr.map((r) => [r.serviceId, r]));

  const totalMap = byId(totalGroups);
  const completedMap = byId(completedGroups);
  const cancelMap = byId(cancelGroups);
  const revenueMap: Record<string, { amount: number; currency: string }> = {};
  for (const r of revenueGroups) {
    revenueMap[r.serviceId] = { amount: r._sum.priceAmount ?? 0, currency: r.currency };
  }

  const rows = services.map((s) => {
    const total = (totalMap[s.id] as { _count: { id: number } } | undefined)?._count.id ?? 0;
    const completed = (completedMap[s.id] as { _count: { id: number } } | undefined)?._count.id ?? 0;
    const cancelled = (cancelMap[s.id] as { _count: { id: number } } | undefined)?._count.id ?? 0;
    const rev = revenueMap[s.id];
    return {
      serviceId: s.id,
      serviceName: s.name,
      priceAmount: s.priceAmount,
      currency: s.currency,
      durationMinutes: s.durationMinutes,
      isActive: s.isActive,
      salonId: s.salon.id,
      salonName: s.salon.name,
      categoryName: s.category?.name ?? null,
      assignedStylistCount: s._count.employees,
      totalBookings: total,
      completedBookings: completed,
      cancelledCount: cancelled,
      revenue: rev?.amount ?? 0,
    };
  });

  return NextResponse.json({ items: rows, total: totalServices, page, pageSize, from, to });
}
