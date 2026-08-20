import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../lib/server/salon-context';
import { salonReportQuerySchema } from '@salonomia/validation';
import { ReservationStatus } from '@salonomia/database';

const REVENUE_STATUSES: ReservationStatus[] = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.CHECKED_IN,
  ReservationStatus.COMPLETED,
];

function toUtcRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);
  return { start, end };
}

export async function GET(req: NextRequest) {
  const superadminCheck = requireSuperadmin(req);
  if (superadminCheck instanceof NextResponse) return superadminCheck;

  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());

  const parsed = salonReportQuerySchema.safeParse(searchParams);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid query parameters.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const query = parsed.data;
  const { start, end } = toUtcRange(query.from, query.to);

  const [total, byStatus, salonRows] = await Promise.all([
    prisma.reservation.count({ where: { startAt: { gte: start, lte: end } } }),
    prisma.reservation.groupBy({
      by: ['status'],
      where: { startAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    prisma.reservation.groupBy({
      by: ['salonId', 'currency'],
      where: {
        status: { in: REVENUE_STATUSES },
        startAt: { gte: start, lte: end },
      },
      _sum: { priceAmount: true },
      _count: { id: true },
    }),
  ]);

  const salonIds = [...new Set(salonRows.map((r: { salonId: string }) => r.salonId))];
  const salons = await prisma.salon.findMany({
    where: { id: { in: salonIds } },
    select: { id: true, name: true, slug: true },
  });
  const salonMap = Object.fromEntries(salons.map((s) => [s.id, s]));

  const byStatusMap = Object.fromEntries(
    byStatus.map((r: { status: string; _count: { id: number } }) => [r.status, r._count.id]),
  );

  const bySalon = salonRows.map(
    (r: {
      salonId: string;
      currency: string;
      _count: { id: number };
      _sum: { priceAmount: number | null };
    }) => ({
      salon: salonMap[r.salonId] ?? { id: r.salonId, name: 'Unknown', slug: '' },
      currency: r.currency,
      confirmedCount: r._count.id,
      confirmedRevenue: r._sum.priceAmount ?? 0,
    }),
  );

  return NextResponse.json({
    total,
    byStatus: byStatusMap,
    bySalon,
    from: query.from,
    to: query.to,
  });
}
