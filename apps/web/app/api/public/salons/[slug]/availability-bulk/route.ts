import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../../../../lib/server/prisma';
import { computeAvailability, computeAnyStylistAvailability } from '../../../../../../lib/server/availability';
import { localWallTimeToUtc } from '../../../../../../lib/server/timezone';

const bulkQuerySchema = z.object({
  serviceId: z.string().uuid(),
  employeeId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const rawParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = bulkQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid query.', errors: parsed.error.flatten() }, { status: 400 });
  }
  const query = parsed.data;

  const salon = await prisma.salon.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: { id: true, timezone: true, bookingPolicy: { select: { minNoticeMinutes: true, maxAdvanceDays: true } } },
  });
  if (!salon) return NextResponse.json({ message: 'Salon not found.' }, { status: 404 });

  const service = await prisma.service.findFirst({
    where: { id: query.serviceId, salonId: salon.id, isActive: true },
    select: { durationMinutes: true, bufferMinutes: true },
  });
  if (!service) return NextResponse.json({ message: 'Service not found.' }, { status: 404 });

  const minNoticeMinutes = salon.bookingPolicy?.minNoticeMinutes ?? 60;
  const maxAdvanceDays = salon.bookingPolicy?.maxAdvanceDays ?? 60;

  const employeeWhere = {
    salonId: salon.id, isActive: true,
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
  const current = new Date(query.startDate);
  const end = new Date(query.endDate);

  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    const day = current.getDate();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const localDate = { year, month, day };
    const rangeStart = localWallTimeToUtc(localDate, 0, salon.timezone);
    const rangeEnd = localWallTimeToUtc(localDate, 24 * 60, salon.timezone);

    const employees = await Promise.all(
      employeesBase.map(async (e) => {
        const [timeOff, reservations] = await Promise.all([
          prisma.timeOff.findMany({
            where: { employeeId: e.id, startAt: { lt: rangeEnd }, endAt: { gt: rangeStart } },
            select: { startAt: true, endAt: true },
          }),
          prisma.reservation.findMany({
            where: { employeeId: e.id, status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] }, startAt: { lt: rangeEnd }, blockedUntil: { gt: rangeStart } },
            select: { startAt: true, endAt: true, blockedUntil: true },
          }),
        ]);
        return { employeeId: e.id, isActive: true, isEligibleForService: true, workingSchedule: e.workingSchedules, breaks: e.breaks, timeOff, blockingReservations: reservations };
      }),
    );

    const input = { salonTimezone: salon.timezone, now, rangeStart, rangeEnd, serviceDurationMinutes: service.durationMinutes, bufferMinutes: service.bufferMinutes, minNoticeMinutes, maxAdvanceDays, employees };
    const slots = query.employeeId ? computeAvailability(input) : computeAnyStylistAvailability(input);
    results[dateStr] = slots.length > 0;
    current.setDate(current.getDate() + 1);
  }

  return NextResponse.json(results);
}
