import { NextRequest, NextResponse } from 'next/server';
import { listCustomerReservationsQuerySchema } from '@salonomia/validation';
import { verifyRequest, unauthorized } from '../../../../lib/server/auth';
import { prisma } from '../../../../lib/server/prisma';
import { ReservationStatus } from '@salonomia/database';

const LIST_SELECT = {
  id: true,
  status: true,
  startAt: true,
  endAt: true,
  priceAmount: true,
  currency: true,
  service: { select: { name: true, durationMinutes: true } },
  employee: { select: { fullName: true } },
  salon: { select: { name: true, slug: true } },
} as const;

export async function GET(req: NextRequest) {
  const payload = verifyRequest(req);
  if (!payload) return unauthorized();

  const rawParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = listCustomerReservationsQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid query.' }, { status: 400 });
  }

  const { page, pageSize, status } = parsed.data;
  const where = {
    customerId: payload.sub,
    ...(status ? { status: status as ReservationStatus } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { startAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.reservation.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}
