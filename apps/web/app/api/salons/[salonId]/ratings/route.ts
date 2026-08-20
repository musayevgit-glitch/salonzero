import { NextRequest, NextResponse } from 'next/server';
import { listSalonRatingsQuerySchema } from '@salonomia/validation';
import { prisma } from '../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../lib/server/salon-context';

/**
 * Ratings for one salon, for its own staff.
 *
 * `getSalonContext` establishes which salon the caller is authorized for before any data is read,
 * and every query below is filtered by that same `salonId` — the id in the URL is never used to
 * fetch rows that are then checked afterwards.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ salonId: string }> }) {
  const { salonId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = listSalonRatingsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid query.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { page, pageSize, stars } = parsed.data;
  const where = { salonId: ctx.salonId, ...(stars ? { stars } : {}) };

  const [rows, total, aggregate] = await Promise.all([
    prisma.rating.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        stars: true,
        comment: true,
        createdAt: true,
        customer: { select: { fullName: true } },
        reservation: {
          select: {
            id: true,
            startAt: true,
            guestName: true,
            service: { select: { name: true } },
            employee: { select: { fullName: true } },
          },
        },
      },
    }),
    prisma.rating.count({ where }),
    // Summary always describes the whole salon, not the current star filter.
    prisma.rating.aggregate({
      where: { salonId: ctx.salonId },
      _avg: { stars: true },
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      stars: r.stars,
      comment: r.comment,
      createdAt: r.createdAt,
      // Manual bookings carry a staff-typed name snapshot; prefer it so staff see what they typed.
      customerName: r.reservation.guestName ?? r.customer.fullName,
      serviceName: r.reservation.service?.name ?? null,
      stylistName: r.reservation.employee?.fullName ?? null,
      reservationStartAt: r.reservation.startAt,
    })),
    total,
    page,
    pageSize,
    avgRating: aggregate._avg.stars,
    ratingCount: aggregate._count._all,
  });
}
