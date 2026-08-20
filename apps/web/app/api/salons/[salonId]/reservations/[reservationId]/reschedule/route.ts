import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../../lib/server/auth';
import { rescheduleReservationSchema } from '@salonomia/validation';
import { isEmployeeSlotAvailable } from '../../../../../../../lib/server/availability';
import { recordAudit } from '../../../../../../../lib/server/audit';
import { clearReservationReminders } from '../../../../../../../lib/server/notifications';

const RESERVATION_SELECT = {
  id: true, salonId: true, serviceId: true, employeeId: true, status: true,
  startAt: true, endAt: true, priceAmount: true, currency: true, customerNote: true, guestName: true, createdAt: true,
} as const;

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN'] as const;
const SLOT_UNAVAILABLE_MESSAGE = 'This time is no longer available. Please choose another time.';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; reservationId: string }> }
) {
  const { salonId, reservationId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const current = await prisma.reservation.findFirst({
    where: { id: reservationId, salonId },
    select: { id: true, status: true, salonId: true, employeeId: true, serviceId: true, startAt: true },
  });
  if (!current) return notFound();

  if (current.status !== 'PENDING' && current.status !== 'CONFIRMED') {
    return NextResponse.json({ message: 'This reservation can no longer be rescheduled.' }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = rescheduleReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const newStartAt = new Date(input.startAt);

  const salon = await prisma.salon.findUnique({
    where: { id: current.salonId },
    select: { timezone: true },
  });
  const service = await prisma.service.findUnique({
    where: { id: current.serviceId },
    select: { durationMinutes: true, bufferMinutes: true },
  });
  const policy = await prisma.bookingPolicy.findUnique({
    where: { salonId: current.salonId },
  });
  if (!salon || !service || !policy) {
    return badRequest('This salon is not configured for booking.');
  }

  const targetEmployeeId = input.employeeId ?? current.employeeId;
  if (input.employeeId) {
    const employee = await prisma.employeeProfile.findFirst({
      where: {
        id: input.employeeId,
        salonId: current.salonId,
        isActive: true,
        eligibleServices: { some: { serviceId: current.serviceId } },
      },
      select: { id: true },
    });
    if (!employee) {
      return badRequest('Invalid stylist for this service.');
    }
  }

  // Load employee availability input
  const windowStart = new Date(newStartAt.getTime() - 24 * 60 * 60_000);
  const windowEnd = new Date(newStartAt.getTime() + 24 * 60 * 60_000);

  const [employee, workingSchedule, breaks, timeOff, blockingReservations] = await Promise.all([
    prisma.employeeProfile.findUnique({
      where: { id: targetEmployeeId },
      select: {
        isActive: true,
        eligibleServices: { where: { serviceId: current.serviceId }, select: { serviceId: true } },
      },
    }),
    prisma.workingSchedule.findMany({ where: { employeeId: targetEmployeeId } }),
    prisma.break.findMany({ where: { employeeId: targetEmployeeId } }),
    prisma.timeOff.findMany({
      where: { employeeId: targetEmployeeId, startAt: { lt: windowEnd }, endAt: { gt: windowStart } },
    }),
    prisma.reservation.findMany({
      where: {
        employeeId: targetEmployeeId,
        id: { not: current.id },
        status: { in: [...ACTIVE_STATUSES] },
        startAt: { lt: windowEnd },
        blockedUntil: { gt: windowStart },
      },
      select: { startAt: true, endAt: true, blockedUntil: true },
    }),
  ]);

  const available = isEmployeeSlotAvailable({
    employee: {
      employeeId: targetEmployeeId,
      isActive: employee?.isActive ?? false,
      isEligibleForService: (employee?.eligibleServices.length ?? 0) > 0,
      workingSchedule,
      breaks,
      timeOff,
      blockingReservations,
    },
    salonTimezone: salon.timezone,
    now: new Date(),
    candidateStart: newStartAt,
    serviceDurationMinutes: service.durationMinutes,
    bufferMinutes: service.bufferMinutes,
    minNoticeMinutes: policy.minNoticeMinutes,
    maxAdvanceDays: policy.maxAdvanceDays,
  });

  if (!available) {
    return NextResponse.json({ message: SLOT_UNAVAILABLE_MESSAGE }, { status: 409 });
  }

  const newEndAt = new Date(newStartAt.getTime() + service.durationMinutes * 60_000);
  const newBlockedUntil = new Date(newEndAt.getTime() + service.bufferMinutes * 60_000);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const conflicting = await tx.reservation.count({
        where: {
          id: { not: current.id },
          employeeId: targetEmployeeId,
          status: { in: [...ACTIVE_STATUSES] },
          startAt: { lt: newBlockedUntil },
          blockedUntil: { gt: newStartAt },
        },
      });
      if (conflicting > 0) {
        throw new Error('SLOT_CONFLICT');
      }

      const result = await tx.reservation.update({
        where: { id: current.id, status: current.status, salonId: current.salonId },
        data: {
          employeeId: targetEmployeeId,
          startAt: newStartAt,
          endAt: newEndAt,
          blockedUntil: newBlockedUntil,
        },
        select: RESERVATION_SELECT,
      });

      await tx.reservationStatusHistory.create({
        data: {
          reservationId: current.id,
          fromStatus: current.status as never,
          toStatus: current.status as never,
          changedByUserId: ctx.userId,
          reason: `Rescheduled from ${current.startAt.toISOString()} to ${newStartAt.toISOString()}`,
        },
      });

      // Reminders were scheduled against the old start time. Drop the unread ones inside the same
      // transaction as the move so the customer can never be reminded for a time that no longer
      // exists; the cron re-creates them for the new time on its next pass.
      await clearReservationReminders(tx, current.id);

      return result;
    });

    await recordAudit({
      actorUserId: ctx.userId,
      action: 'reservation.rescheduled',
      targetType: 'Reservation',
      targetId: current.id,
      salonId: current.salonId,
      metadata: {
        fromStartAt: current.startAt.toISOString(),
        toStartAt: newStartAt.toISOString(),
        byCustomer: false,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ message: 'This reservation was already updated by someone else.' }, { status: 409 });
  }
}
