import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest, unauthorized } from '../../../../lib/server/auth';
import { prisma } from '../../../../lib/server/prisma';

const RES_SELECT = {
  id: true,
  status: true,
  startAt: true,
  endAt: true,
  priceAmount: true,
  currency: true,
  guestName: true,
  service: { select: { id: true, name: true } },
  customer: { select: { email: true, fullName: true } },
} as const;

export async function GET(req: NextRequest) {
  const payload = verifyRequest(req);
  if (!payload) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      employeeProfile: {
        select: {
          id: true,
          salonId: true,
          salon: { select: { name: true, timezone: true } },
        },
      },
    },
  });

  const employee = user?.employeeProfile;
  if (!employee) {
    return NextResponse.json({ message: 'Not a stylist.' }, { status: 403 });
  }

  const now = new Date();

  // Today window (UTC midnight-to-midnight is fine for overview purposes)
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setUTCHours(23, 59, 59, 999);

  // Upcoming: today through next 7 days
  const sevenDaysEnd = new Date(todayEnd);
  sevenDaysEnd.setDate(sevenDaysEnd.getDate() + 6);

  // Month window
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const [todayReservations, upcomingReservations, monthTotal] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        employeeId: employee.id,
        startAt: { gte: todayStart, lte: todayEnd },
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      },
      select: RES_SELECT,
      orderBy: { startAt: 'asc' },
    }),
    prisma.reservation.findMany({
      where: {
        employeeId: employee.id,
        startAt: { gte: todayStart, lte: sevenDaysEnd },
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
      },
      select: RES_SELECT,
      orderBy: { startAt: 'asc' },
      take: 30,
    }),
    prisma.reservation.count({
      where: {
        employeeId: employee.id,
        startAt: { gte: monthStart, lte: monthEnd },
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'] },
      },
    }),
  ]);

  return NextResponse.json({
    salonId: employee.salonId,
    salonName: employee.salon.name,
    employeeId: employee.id,
    todayReservations,
    upcomingReservations,
    monthTotal,
  });
}
