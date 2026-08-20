import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';

const PUBLIC_SERVICE_SELECT = {
  id: true, name: true, description: true, priceAmount: true, currency: true, durationMinutes: true,
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const salon = await prisma.salon.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: {
      id: true, slug: true, name: true, description: true, addressLine: true, city: true,
      phone: true, email: true, genderFocus: true, logoUrl: true, coverUrl: true,
      bookingPolicy: {
        select: { autoConfirm: true, cancellationWindowHours: true, rescheduleWindowHours: true, minNoticeMinutes: true, maxAdvanceDays: true },
      },
      serviceCategories: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, services: { where: { isActive: true }, orderBy: { name: 'asc' }, select: PUBLIC_SERVICE_SELECT } },
      },
      employees: {
        where: { isActive: true },
        orderBy: { fullName: 'asc' },
        select: {
          id: true, fullName: true, bio: true,
          portfolio: { orderBy: { sortOrder: 'asc' }, select: { id: true, imageUrl: true, caption: true } },
          workingSchedules: { select: { weekday: true, startMinuteOfDay: true, endMinuteOfDay: true } },
        },
      },
    },
  });
  if (!salon) return NextResponse.json({ message: 'Salon not found.' }, { status: 404 });

  const [uncategorizedServices, ratingAggregate] = await Promise.all([
    prisma.service.findMany({
      where: { salonId: salon.id, isActive: true, categoryId: null },
      orderBy: { name: 'asc' },
      select: PUBLIC_SERVICE_SELECT,
    }),
    // Aggregate only — individual ratings are not part of the public salon payload.
    prisma.rating.aggregate({
      where: { salonId: salon.id },
      _avg: { stars: true },
      _count: { _all: true },
    }),
  ]);

  const openingHoursByWeekday = new Map<number, { startMinuteOfDay: number; endMinuteOfDay: number }>();
  for (const emp of salon.employees) {
    for (const block of emp.workingSchedules) {
      const existing = openingHoursByWeekday.get(block.weekday);
      if (!existing) {
        openingHoursByWeekday.set(block.weekday, { startMinuteOfDay: block.startMinuteOfDay, endMinuteOfDay: block.endMinuteOfDay });
      } else {
        existing.startMinuteOfDay = Math.min(existing.startMinuteOfDay, block.startMinuteOfDay);
        existing.endMinuteOfDay = Math.max(existing.endMinuteOfDay, block.endMinuteOfDay);
      }
    }
  }

  return NextResponse.json({
    id: salon.id, slug: salon.slug, name: salon.name, description: salon.description,
    addressLine: salon.addressLine, city: salon.city, phone: salon.phone, email: salon.email,
    genderFocus: salon.genderFocus,
    logoUrl: salon.logoUrl, coverUrl: salon.coverUrl,
    // null (not 0) when nobody has rated yet, so the UI can say so instead of showing a zero score.
    avgRating: ratingAggregate._avg.stars,
    ratingCount: ratingAggregate._count._all,
    bookingPolicySummary: salon.bookingPolicy,
    approximateOpeningHours: [...openingHoursByWeekday.entries()]
      .map(([weekday, h]) => ({ weekday, ...h }))
      .sort((a, b) => a.weekday - b.weekday),
    serviceCategories: salon.serviceCategories,
    uncategorizedServices,
    employees: salon.employees.map((e) => ({
      id: e.id, fullName: e.fullName, bio: e.bio,
      portfolio: e.portfolio.map((p) => ({ id: p.id, imageUrl: p.imageUrl, caption: p.caption })),
    })),
  });
}
