import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../lib/server/salon-context';

function dayBoundaries(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
  );
  return { start, end };
}

function weekBoundaries() {
  const now = new Date();
  const day = now.getUTCDay();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + (6 - day),
      23,
      59,
      59,
      999,
    ),
  );
  return { start, end };
}

function monthBoundaries() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

export async function GET(req: NextRequest) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const today = dayBoundaries();
  const week = weekBoundaries();
  const month = monthBoundaries();

  const [
    totalSalons,
    activeSalons,
    totalStylists,
    activeStylists,
    totalServices,
    activeServices,
    totalReservations,
    reservationsToday,
    reservationsWeek,
    reservationsMonth,
    totalCustomers,
    recentSalons,
    recentStylists,
  ] = await Promise.all([
    prisma.salon.count(),
    prisma.salon.count({ where: { status: 'ACTIVE' } }),
    prisma.employeeProfile.count(),
    prisma.employeeProfile.count({ where: { isActive: true } }),
    prisma.service.count(),
    prisma.service.count({ where: { isActive: true } }),
    prisma.reservation.count(),
    prisma.reservation.count({ where: { startAt: { gte: today.start, lte: today.end } } }),
    prisma.reservation.count({ where: { startAt: { gte: week.start, lte: week.end } } }),
    prisma.reservation.count({ where: { startAt: { gte: month.start, lte: month.end } } }),
    prisma.user.count({ where: { isSuperadmin: false, memberships: { none: {} } } }),
    prisma.salon.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, status: true, city: true, createdAt: true },
    }),
    prisma.employeeProfile.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        salon: { select: { id: true, name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    salons: {
      total: totalSalons,
      active: activeSalons,
      suspended: totalSalons - activeSalons,
    },
    stylists: {
      total: totalStylists,
      active: activeStylists,
      inactive: totalStylists - activeStylists,
    },
    services: {
      total: totalServices,
      active: activeServices,
      inactive: totalServices - activeServices,
    },
    reservations: {
      total: totalReservations,
      today: reservationsToday,
      week: reservationsWeek,
      month: reservationsMonth,
    },
    customers: { total: totalCustomers },
    recentSalons,
    recentStylists: recentStylists.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      isActive: s.isActive,
      createdAt: s.createdAt,
      salonId: s.salon.id,
      salonName: s.salon.name,
    })),
  });
}
