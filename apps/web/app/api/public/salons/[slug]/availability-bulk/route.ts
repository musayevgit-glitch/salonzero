import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyRequest } from '../../../../../../lib/server/auth';
import { prisma } from '../../../../../../lib/server/prisma';
import {
  computeAvailability,
  computeAnyStylistAvailability,
} from '../../../../../../lib/server/availability';
import { blockingHoldFilter } from '../../../../../../lib/server/slot-holds';
import { localWallTimeToUtc } from '../../../../../../lib/server/timezone';

const bulkQuerySchema = z.object({
  serviceId: z.string().uuid(),
  employeeId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rawParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = bulkQuerySchema.safeParse(rawParams);
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
  // Salon-configured grid spacing; 15 matches the historical hardcoded default.
  const slotIntervalMinutes = salon.bookingPolicy?.bookingSlotIntervalMinutes ?? 15;

  // A hold the *viewer* placed must not make their own day look unavailable while they are still
  // in the booking flow. Other customers' holds still do block, as they should.
  const viewer = verifyRequest(req);
  const viewerId = viewer?.sub ?? null;

  const employeeWhere = {
    salonId: salon.id,
    isActive: true,
    eligibleServices: { some: { serviceId: query.serviceId } },
    ...(query.employeeId ? { id: query.employeeId } : {}),
  };

  const employeesBase = await prisma.employeeProfile.findMany({
    where: employeeWhere,
    select: {
      id: true,
      workingSchedules: { select: { weekday: true, startMinuteOfDay: true, endMinuteOfDay: true } },
      breaks: { select: { weekday: true, startMinuteOfDay: true, endMinuteOfDay: true } },
    },
  });

  const now = new Date();
  const results: Record<string, boolean> = {};

  /**
   * Calendar dates are iterated as pure Y-M-D values anchored to UTC.
   *
   * The previous implementation did `new Date('2026-08-20')` — which parses to UTC midnight —
   * and then read it back with the *local* getters `getFullYear()/getMonth()/getDate()`. On any
   * deployment whose server clock is behind UTC that yields 2026-08-19, so every key in the
   * response was shifted by one day and the calendar showed the wrong day's availability.
   * Using the UTC getters keeps the key identical to the date the caller asked for; the real
   * timezone conversion happens in `localWallTimeToUtc`, which maps the calendar date onto the
   * salon's own wall clock.
   */
  const current = new Date(`${query.startDate}T00:00:00Z`);
  const end = new Date(`${query.endDate}T00:00:00Z`);
  if (Number.isNaN(current.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ message: 'Invalid date range.' }, { status: 400 });
  }
  // Bound the loop so a hostile range cannot fan out into unbounded queries.
  const MAX_DAYS = 120;
  let iterations = 0;

  while (current <= end && iterations < MAX_DAYS) {
    iterations += 1;
    const year = current.getUTCFullYear();
    const month = current.getUTCMonth() + 1;
    const day = current.getUTCDate();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const localDate = { year, month, day };
    const rangeStart = localWallTimeToUtc(localDate, 0, salon.timezone);
    const rangeEnd = localWallTimeToUtc(localDate, 24 * 60, salon.timezone);

    const employeeIds = employeesBase.map((e) => e.id);
    const employees = await Promise.all(
      employeesBase.map(async (e) => {
        const [timeOff, reservations, holds] = await Promise.all([
          prisma.timeOff.findMany({
            where: { employeeId: e.id, startAt: { lt: rangeEnd }, endAt: { gt: rangeStart } },
            select: { startAt: true, endAt: true },
          }),
          prisma.reservation.findMany({
            where: {
              employeeId: e.id,
              status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
              startAt: { lt: rangeEnd },
              blockedUntil: { gt: rangeStart },
            },
            select: { startAt: true, endAt: true, blockedUntil: true },
          }),
          prisma.slotHold.findMany({
            where: {
              employeeId: e.id,
              startAt: { lt: rangeEnd },
              endAt: { gt: rangeStart },
              ...blockingHoldFilter(now, viewerId),
            },
            select: { startAt: true, endAt: true },
          }),
        ]);
        void employeeIds;
        return {
          employeeId: e.id,
          isActive: true,
          isEligibleForService: true,
          workingSchedule: e.workingSchedules,
          breaks: e.breaks,
          timeOff,
          blockingReservations: [
            ...reservations,
            ...holds.map((h) => ({ startAt: h.startAt, endAt: h.endAt, blockedUntil: h.endAt })),
          ],
        };
      }),
    );

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
      employees,
    };
    const slots = query.employeeId
      ? computeAvailability(input)
      : computeAnyStylistAvailability(input);
    results[dateStr] = slots.length > 0;
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return NextResponse.json(results);
}
