import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyRequest, unauthorized } from '../../../../lib/server/auth';
import { prisma } from '../../../../lib/server/prisma';
import { blockingHoldFilter } from '../../../../lib/server/slot-holds';

const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes

const createHoldSchema = z.object({
  employeeId: z.string().uuid(),
  salonId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  // Holds occupy real capacity, so placing one requires a session. Anonymous holds would let
  // anyone block a salon's whole calendar for 10 minutes at a time, and an unowned hold cannot
  // be excluded when the same customer later creates the reservation.
  const auth = verifyRequest(req);
  if (!auth) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = createHoldSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const { employeeId, salonId, startAt: startAtStr, endAt: endAtStr } = parsed.data;
  const startAt = new Date(startAtStr);
  const endAt = new Date(endAtStr);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + HOLD_DURATION_MS);

  // Verify the salon and employee exist
  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId, isActive: true },
    select: { id: true },
  });
  if (!employee) {
    return NextResponse.json({ message: 'Stylist not found.' }, { status: 404 });
  }

  // Check for active conflicting reservations
  const conflictingReservation = await prisma.reservation.count({
    where: {
      employeeId,
      status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      startAt: { lt: endAt },
      blockedUntil: { gt: startAt },
    },
  });
  if (conflictingReservation > 0) {
    return NextResponse.json({ message: 'This time slot is no longer available.' }, { status: 409 });
  }

  // Check for active conflicting holds
  // Only *other* customers' holds conflict. Re-entering the date/time step, or picking the same
  // slot twice, must not lock a customer out of the time they themselves are holding.
  const conflictingHold = await prisma.slotHold.count({
    where: {
      employeeId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...blockingHoldFilter(now, auth.sub),
    },
  });
  if (conflictingHold > 0) {
    return NextResponse.json({ message: 'This time slot is temporarily held by another customer.' }, { status: 409 });
  }

  // Drop this customer's earlier holds for the salon so stepping back and forth through the
  // booking flow cannot leave a trail of stale holds occupying the calendar.
  await prisma.slotHold.deleteMany({ where: { heldByUserId: auth.sub, salonId } });

  const hold = await prisma.slotHold.create({
    data: { salonId, employeeId, startAt, endAt, expiresAt, heldByUserId: auth.sub },
    select: { id: true, expiresAt: true },
  });

  return NextResponse.json({ id: hold.id, expiresAt: hold.expiresAt.toISOString() }, { status: 201 });
}
