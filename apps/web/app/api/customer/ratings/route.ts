import { NextRequest, NextResponse } from 'next/server';
import { createRatingSchema } from '@salonomia/validation';
import { verifyRequest, unauthorized, badRequest } from '../../../../lib/server/auth';
import { prisma } from '../../../../lib/server/prisma';

/**
 * Submits a rating for one completed reservation.
 *
 * The client sends only a reservationId, stars and an optional comment. Everything that decides
 * *who* is rating and *what* is being rated is re-derived server-side:
 *
 *  - the reservation is looked up filtered by `customerId = <authenticated user>`, so another
 *    customer's visit is simply not found (never "found, then authorized");
 *  - `salonId` is copied off that reservation, so a client cannot attribute a rating to a salon
 *    it never visited;
 *  - only COMPLETED reservations are ratable, so a pending or cancelled booking cannot be used
 *    to manufacture reviews.
 *
 * `Rating.reservationId` is UNIQUE in the database, so the "already rated" check below is a
 * fast path, not the actual guarantee — a concurrent double-submit is still caught by P2002.
 */
export async function POST(req: NextRequest) {
  const payload = verifyRequest(req);
  if (!payload) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = createRatingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const { reservationId, stars, comment } = parsed.data;

  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, customerId: payload.sub },
    select: { id: true, salonId: true, status: true },
  });
  if (!reservation) {
    return NextResponse.json({ message: 'Reservation not found.' }, { status: 404 });
  }

  if (reservation.status !== 'COMPLETED') {
    return NextResponse.json(
      { message: 'Only completed reservations can be rated.' },
      { status: 409 },
    );
  }

  const existing = await prisma.rating.findUnique({
    where: { reservationId },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ message: 'This reservation has already been rated.' }, { status: 409 });
  }

  try {
    const rating = await prisma.rating.create({
      data: {
        reservationId,
        customerId: payload.sub,
        salonId: reservation.salonId,
        stars,
        comment: comment ?? null,
      },
      select: { id: true, reservationId: true, stars: true, comment: true, createdAt: true },
    });
    return NextResponse.json(rating, { status: 201 });
  } catch (err) {
    // Unique violation on reservationId — a concurrent submit won the race.
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ message: 'This reservation has already been rated.' }, { status: 409 });
    }
    throw err;
  }
}
