import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../../lib/server/salon-context';
import { notFound, badRequest } from '../../../../../../../lib/server/auth';
import { reservationReasonSchema } from '@salonomia/validation';
import { recordAudit } from '../../../../../../../lib/server/audit';

const RESERVATION_SELECT = {
  id: true, salonId: true, serviceId: true, employeeId: true, status: true,
  startAt: true, endAt: true, priceAmount: true, currency: true, customerNote: true, guestName: true, createdAt: true,
} as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; reservationId: string }> }
) {
  const { salonId, reservationId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const current = await prisma.reservation.findFirst({
    where: { id: reservationId, salonId },
    select: { id: true, status: true, salonId: true },
  });
  if (!current) return notFound();

  if (current.status !== 'PENDING' && current.status !== 'CONFIRMED') {
    return NextResponse.json({ message: 'This reservation can no longer be cancelled.' }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = reservationReasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const { reason } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.reservation.update({
        where: { id: current.id, status: current.status, salonId: current.salonId },
        data: { status: 'CANCELLED_BY_SALON', cancelledAt: new Date() },
        select: RESERVATION_SELECT,
      });

      await tx.reservationStatusHistory.create({
        data: {
          reservationId: current.id,
          fromStatus: current.status as never,
          toStatus: 'CANCELLED_BY_SALON',
          changedByUserId: ctx.userId,
          reason,
        },
      });

      return result;
    });

    await recordAudit({
      actorUserId: ctx.userId,
      action: 'reservation.cancelled_by_salon',
      targetType: 'Reservation',
      targetId: current.id,
      salonId,
      metadata: { fromStatus: current.status, toStatus: 'CANCELLED_BY_SALON', reason },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ message: 'This reservation was already updated by someone else.' }, { status: 409 });
  }
}
