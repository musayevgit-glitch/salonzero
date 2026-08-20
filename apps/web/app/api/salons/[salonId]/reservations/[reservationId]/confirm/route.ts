import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/server/prisma';
import {
  getSalonContext,
  isSalonContextError,
} from '../../../../../../../lib/server/salon-context';
import { notFound, badRequest } from '../../../../../../../lib/server/auth';
import { recordAudit } from '../../../../../../../lib/server/audit';

const RESERVATION_SELECT = {
  id: true,
  salonId: true,
  serviceId: true,
  employeeId: true,
  status: true,
  startAt: true,
  endAt: true,
  priceAmount: true,
  currency: true,
  customerNote: true,
  guestName: true,
  createdAt: true,
} as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; reservationId: string }> },
) {
  const { salonId, reservationId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const current = await prisma.reservation.findFirst({
    where: { id: reservationId, salonId },
    select: { id: true, status: true, salonId: true, customerId: true },
  });
  if (!current) return notFound();

  if (current.status === 'CONFIRMED') {
    const detail = await prisma.reservation.findFirst({
      where: { id: reservationId },
      select: RESERVATION_SELECT,
    });
    return NextResponse.json(detail);
  }

  if (current.status !== 'PENDING') {
    return NextResponse.json(
      { message: 'Only a pending reservation can be confirmed.' },
      { status: 409 },
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.reservation.update({
        where: { id: current.id, status: current.status, salonId: current.salonId },
        data: { status: 'CONFIRMED' },
        select: RESERVATION_SELECT,
      });

      await tx.reservationStatusHistory.create({
        data: {
          reservationId: current.id,
          fromStatus: current.status as never,
          toStatus: 'CONFIRMED',
          changedByUserId: ctx.userId,
        },
      });

      return result;
    });

    await recordAudit({
      actorUserId: ctx.userId,
      action: 'reservation.confirmed',
      targetType: 'Reservation',
      targetId: current.id,
      salonId,
      metadata: { fromStatus: current.status, toStatus: 'CONFIRMED' },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { message: 'This reservation was already updated by someone else.' },
      { status: 409 },
    );
  }
}
