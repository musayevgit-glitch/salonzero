import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../../lib/server/salon-context';
import { notFound } from '../../../../../../../lib/server/auth';
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
    select: { id: true, status: true, salonId: true, endAt: true },
  });
  if (!current) return notFound();

  if (current.status !== 'CONFIRMED') {
    return NextResponse.json({ message: 'Only a confirmed reservation can be marked no-show.' }, { status: 409 });
  }

  if (new Date().getTime() <= current.endAt.getTime()) {
    return NextResponse.json({ message: 'A reservation can only be marked no-show after its scheduled time.' }, { status: 409 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.reservation.update({
        where: { id: current.id, status: current.status, salonId: current.salonId },
        data: { status: 'NO_SHOW' },
        select: RESERVATION_SELECT,
      });

      await tx.reservationStatusHistory.create({
        data: {
          reservationId: current.id,
          fromStatus: current.status as never,
          toStatus: 'NO_SHOW',
          changedByUserId: ctx.userId,
        },
      });

      return result;
    });

    await recordAudit({
      actorUserId: ctx.userId,
      action: 'reservation.no_show',
      targetType: 'Reservation',
      targetId: current.id,
      salonId,
      metadata: { fromStatus: current.status, toStatus: 'NO_SHOW' },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ message: 'This reservation was already updated by someone else.' }, { status: 409 });
  }
}
