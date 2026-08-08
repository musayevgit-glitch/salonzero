import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../lib/server/prisma';

const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes

const createHoldSchema = z.object({
  employeeId: z.string().uuid(),
  salonId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export async function POST(req: NextRequest) {
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
  const conflictingHold = await prisma.slotHold.count({
    where: {
      employeeId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      expiresAt: { gt: now },
    },
  });
  if (conflictingHold > 0) {
    return NextResponse.json({ message: 'This time slot is temporarily held by another customer.' }, { status: 409 });
  }

  const hold = await prisma.slotHold.create({
    data: { salonId, employeeId, startAt, endAt, expiresAt },
    select: { id: true, expiresAt: true },
  });

  return NextResponse.json({ id: hold.id, expiresAt: hold.expiresAt.toISOString() }, { status: 201 });
}
