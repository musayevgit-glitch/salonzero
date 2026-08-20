import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../lib/server/salon-context';
import { salonReportQuerySchema } from '@salonomia/validation';

const REVENUE_STATUSES = ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'];

function toUtcRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);
  return { start, end };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ salonId: string }> }) {
  const { salonId } = await params;
  const ctx = await getSalonContext(req, salonId, 'ANY');
  if (isSalonContextError(ctx)) return ctx;

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

  const reservations = await prisma.reservation.findMany({
    where: {
      salonId,
      startAt: { gte: start, lte: end },
    },
    select: {
      id: true,
      status: true,
      startAt: true,
      priceAmount: true,
      currency: true,
      service: { select: { name: true } },
    },
    orderBy: { startAt: 'asc' },
  });

  const total = reservations.length;
  const byStatus = reservations.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const revenueMap = new Map<string, number>();
  for (const r of reservations) {
    if (REVENUE_STATUSES.includes(r.status)) {
      revenueMap.set(r.currency, (revenueMap.get(r.currency) ?? 0) + r.priceAmount);
    }
  }
  const revenue = Object.fromEntries(revenueMap);

  const byDay = reservations.reduce<Record<string, number>>((acc, r) => {
    const day = r.startAt.toISOString().slice(0, 10);
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});

  const byService = reservations.reduce<Record<string, number>>((acc, r) => {
    const name = r.service.name;
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
  const topServices = Object.entries(byService)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return NextResponse.json({
    total,
    byStatus,
    revenue,
    byDay,
    topServices,
    from: query.from,
    to: query.to,
  });
}
