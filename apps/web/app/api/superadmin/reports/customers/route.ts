import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../../lib/server/salon-context';

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

  const resWhere = {
    ...(salonId ? { salonId } : {}),
    startAt: { gte: start, lte: end },
  };

  const [customerGroups, total, totalAllTime, newCustomers] = await Promise.all([
    prisma.reservation.groupBy({
      by: ['customerId'],
      where: resWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.reservation.findMany({
      where: resWhere,
      distinct: ['customerId'],
      select: { customerId: true },
    }),
    prisma.user.count({ where: { isSuperadmin: false } }),
    prisma.user.count({
      where: {
        isSuperadmin: false,
        createdAt: { gte: start, lte: end },
      },
    }),
  ]);

  const customerIds = customerGroups.map((g) => g.customerId);
  const customers = await prisma.user.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, fullName: true, email: true, phone: true, createdAt: true },
  });
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));

  const rows = customerGroups.map((g) => {
    const c = customerMap[g.customerId];
    return {
      customerId: g.customerId,
      fullName: c?.fullName ?? 'Unknown',
      email: c?.email ?? '',
      phone: c?.phone ?? null,
      memberSince: c?.createdAt ?? null,
      bookingCount: g._count.id,
    };
  });

  const uniqueInPeriod = total.length;
  const returningInPeriod = rows.filter((r) => r.bookingCount > 1).length;

  return NextResponse.json({
    items: rows,
    total: uniqueInPeriod,
    page,
    pageSize,
    from,
    to,
    summary: {
      totalAllTime,
      uniqueInPeriod,
      newInPeriod: newCustomers,
      returningInPeriod,
    },
  });
}
