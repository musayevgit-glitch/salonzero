import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../lib/server/salon-context';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string }> },
) {
  const { salonId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const url = new URL(req.url);
  const search = url.searchParams.get('search') ?? '';
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') ?? '25')));

  const where = {
    reservations: { some: { salonId } },
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        reservations: {
          where: { salonId },
          select: { id: true, status: true, startAt: true },
          orderBy: { startAt: 'desc' },
        },
      },
      orderBy: { fullName: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const now = new Date();

  const items = users.map((user) => {
    const reservations = user.reservations;
    const totalVisits = reservations.filter((r) => r.status === 'COMPLETED').length;
    const lastVisit =
      reservations.find((r) => r.status === 'COMPLETED')?.startAt?.toISOString() ?? null;
    const nextBooking =
      [...reservations]
        .filter(
          (r) =>
            r.startAt > now && (r.status === 'CONFIRMED' || r.status === 'PENDING' || r.status === 'CHECKED_IN'),
        )
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0]?.startAt?.toISOString() ??
      null;

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      totalVisits,
      lastVisit,
      nextBooking,
    };
  });

  return NextResponse.json({ items, total, page, pageSize });
}
