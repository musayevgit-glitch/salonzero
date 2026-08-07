import { NextRequest, NextResponse } from 'next/server';
import { reservationReasonSchema } from '@salonomia/validation';
import { verifyRequest, unauthorized } from '../../../../../lib/server/auth';
import { prisma } from '../../../../../lib/server/prisma';
import { recordAudit } from '../../../../../lib/server/audit';

const CANCELLABLE = ['PENDING', 'CONFIRMED'] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authPayload = verifyRequest(req);
  if (!authPayload) return unauthorized();

  const { id } = await params;
  let body: unknown;
  try {
    body = req.headers.get('content-length') === '0' ? {} : await req.json();
  } catch {
    body = {};
  }

  const parsed = reservationReasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });
  }

  const reservation = await prisma.reservation.findFirst({
    where: { id, customerId: authPayload.sub },
    select: { id: true, status: true, startAt: true, salonId: true, customerId: true },
  });
  if (!reservation) return NextResponse.json({ message: 'Reservation not found.' }, { status: 404 });

  if (!(CANCELLABLE as readonly string[]).includes(reservation.status)) {
    return NextResponse.json({ message: 'This reservation cannot be cancelled.' }, { status: 409 });
  }

  const policy = await prisma.bookingPolicy.findUnique({ where: { salonId: reservation.salonId } });
  const windowHours = policy?.cancellationWindowHours ?? 24;
  const deadline = reservation.startAt.getTime() - windowHours * 60 * 60_000;
  if (Date.now() >= deadline) {
    return NextResponse.json({ message: 'This reservation can no longer be cancelled online.' }, { status: 409 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.reservation.update({
      where: { id },
      data: { status: 'CANCELLED_BY_CUSTOMER', cancelledAt: new Date() },
      select: { id: true, status: true, startAt: true, endAt: true },
    });
    await tx.reservationStatusHistory.create({
      data: { reservationId: id, fromStatus: reservation.status as never, toStatus: 'CANCELLED_BY_CUSTOMER', changedByUserId: authPayload.sub, reason: parsed.data.reason ?? null },
    });
    await tx.notification.create({ data: { userId: authPayload.sub, type: 'reservation.cancelled_by_customer', payload: { reservationId: id } } });
    return r;
  });

  await recordAudit({ actorUserId: authPayload.sub, action: 'reservation.cancelled_by_customer', targetType: 'Reservation', targetId: id, salonId: reservation.salonId });
  return NextResponse.json(updated);
}
