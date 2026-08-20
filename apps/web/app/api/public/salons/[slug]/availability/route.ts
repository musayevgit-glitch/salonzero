import { NextRequest, NextResponse } from 'next/server';
import { publicAvailabilityQuerySchema } from '@salonomia/validation';
import { verifyRequest } from '../../../../../../lib/server/auth';
import { prisma } from '../../../../../../lib/server/prisma';
import {
  computeAvailability,
  computeAnyStylistAvailability,
} from '../../../../../../lib/server/availability';
import { blockingHoldFilter } from '../../../../../../lib/server/slot-holds';
import { localWallTimeToUtc } from '../../../../../../lib/server/timezone';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rawParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = publicAvailabilityQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid query.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const query = parsed.data;

  const salon = await prisma.salon.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: {
      id: true,
      timezone: true,
      bookingPolicy: {
        select: { minNoticeMinutes: true, maxAdvanceDays: true, bookingSlotIntervalMinutes: true },
      },
    },
  });
  if (!salon) return NextResponse.json({ message: 'Salon not found.' }, { status: 404 });

  const service = await prisma.service.findFirst({
    where: { id: query.serviceId, salonId: salon.id, isActive: true },
    select: { durationMinutes: true, bufferMinutes: true },
  });
  if (!service) return NextResponse.json({ message: 'Service not found.' }, { status: 404 });

  const minNoticeMinutes = salon.bookingPolicy?.minNoticeMinutes ?? 60;
  const maxAdvanceDays = salon.bookingPolicy?.maxAdvanceDays ?? 60;
  // Slot interval equals service duration + buffer so back-to-back bookings fill cleanly.
  // Example: 30 min service + 15 min buffer → slots at 9:00, 9:45, 10:30, …
  const slotIntervalMinutes = service.durationMinutes + service.bufferMinutes;

  // The viewer's own hold must not hide the very slot they are in the middle of booking.
  const viewerId = verifyRequest(req)?.sub ?? null;

  const [year, month, day] = query.date.split('-').map(Number) as [number, number, number];
  const localDate = { year, month, day };
  const rangeStart = localWallTimeToUtc(localDate, 0, salon.timezone);
  const rangeEnd = localWallTimeToUtc(localDate, 24 * 60, salon.timezone);

  // Default working schedule used when an employee has no explicit WorkingSchedule rows:
  // Monday-Saturday (weekdays 1-6), 09:00-20:00 local salon time.
  const DEFAULT_SCHEDULE = [1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    startMinuteOfDay: 9 * 60,  // 09:00
    endMinuteOfDay: 20 * 60,   // 20:00
  }));

  const employeeWhere = {
    salonId: salon.id,
    isActive: true,
    ...(query.employeeId ? { id: query.employeeId } : {}),
  };

  const employees = await prisma.employeeProfile.findMany({
    where: employeeWhere,
    select: {
      id: true,
      workingSchedules: { select: { weekday: true, startMinuteOfDay: true, endMinuteOfDay: true } },
      breaks: { select: { weekday: true, startMinuteOfDay: true, endMinuteOfDay: true } },
      timeOff: {
        where: { startAt: { lt: rangeEnd }, endAt: { gt: rangeStart } },
        select: { startAt: true, endAt: true },
      },
      reservations: {
        where: {
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          startAt: { lt: rangeEnd },
          blockedUntil: { gt: rangeStart },
        },
        select: { startAt: true, endAt: true, blockedUntil: true },
      },
    },
  });

  const now = new Date();

  // Fetch active slot holds for these employees to exclude temporarily held slots
  const employeeIds = employees.map((e) => e.id);
  const activeHolds =
    employeeIds.length > 0
      ? await prisma.slotHold.findMany({
          where: {
            employeeId: { in: employeeIds },
            startAt: { lt: rangeEnd },
            endAt: { gt: rangeStart },
            ...blockingHoldFilter(now, viewerId),
          },
          select: { employeeId: true, startAt: true, endAt: true },
        })
      : [];

  const input = {
    salonTimezone: salon.timezone,
    now,
    rangeStart,
    rangeEnd,
    serviceDurationMinutes: service.durationMinutes,
    bufferMinutes: service.bufferMinutes,
    minNoticeMinutes,
    maxAdvanceDays,
    slotIntervalMinutes,
    employees: employees.map((e) => ({
      employeeId: e.id,
      isActive: true,
      isEligibleForService: true,
      workingSchedule: e.workingSchedules.length > 0 ? e.workingSchedules : DEFAULT_SCHEDULE,
      breaks: e.breaks,
      timeOff: e.timeOff,
      blockingReservations: [
        ...e.reservations,
        ...activeHolds
          .filter((h) => h.employeeId === e.id)
          .map((h) => ({ startAt: h.startAt, endAt: h.endAt, blockedUntil: h.endAt })),
      ],
    })),
  };

  const slots = query.employeeId
    ? computeAvailability(input).map((s) => ({ startAt: s.startAt, endAt: s.endAt }))
    : computeAnyStylistAvailability(input);

  return NextResponse.json({
    date: query.date,
    timezone: salon.timezone,
    slots: slots.map((s) => ({ startAt: s.startAt.toISOString(), endAt: s.endAt.toISOString() })),
  });
}
