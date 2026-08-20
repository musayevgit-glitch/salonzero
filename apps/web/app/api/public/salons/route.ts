import { NextRequest, NextResponse } from 'next/server';
import { listPublicSalonsQuerySchema } from '@salonomia/validation';
import { prisma } from '../../../../lib/server/prisma';
import { Prisma } from '@salonomia/database';

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = listPublicSalonsQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid query.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const query = parsed.data;
  const priceFilter: Prisma.ServiceWhereInput = { isActive: true };
  if (query.minPrice !== undefined) priceFilter.priceAmount = { gte: query.minPrice };
  if (query.maxPrice !== undefined) {
    priceFilter.priceAmount = { ...(priceFilter.priceAmount as object), lte: query.maxPrice };
  }

  const where: Prisma.SalonWhereInput = {
    status: 'ACTIVE',
    ...(query.search
      ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { city: { contains: query.search, mode: 'insensitive' } }] }
      : {}),
    ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
    ...(query.genderFocus ? { genderFocus: query.genderFocus } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined ? { services: { some: priceFilter } } : {}),
  };

  const orderBy: Prisma.SalonOrderByWithRelationInput =
    query.sort === 'name_desc' ? { name: 'desc' } : query.sort === 'newest' ? { createdAt: 'desc' } : { name: 'asc' };

  const [rows, total] = await Promise.all([
    prisma.salon.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true, slug: true, name: true, description: true, city: true, genderFocus: true,
        logoUrl: true, coverUrl: true,
        services: { where: { isActive: true }, orderBy: { priceAmount: 'asc' }, take: 1, select: { priceAmount: true, currency: true } },
        // Real service categories power the card chips — the cards must never invent labels.
        serviceCategories: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true },
        },
      },
    }),
    prisma.salon.count({ where }),
  ]);

  // Ratings are aggregated for the page of salons actually being returned, in one grouped query,
  // rather than per-card. A salon with no ratings simply has no group — the card then shows
  // "no rating yet" instead of inventing a number.
  const ratingGroups = rows.length
    ? await prisma.rating.groupBy({
        by: ['salonId'],
        where: { salonId: { in: rows.map((r) => r.id) } },
        _avg: { stars: true },
        _count: { _all: true },
      })
    : [];
  const ratingBySalon = new Map(ratingGroups.map((g) => [g.salonId, g]));

  return NextResponse.json({
    items: rows.map((r) => {
      const rating = ratingBySalon.get(r.id);
      return {
        id: r.id, slug: r.slug, name: r.name, description: r.description, city: r.city, genderFocus: r.genderFocus,
        logoUrl: r.logoUrl, coverUrl: r.coverUrl,
        categories: r.serviceCategories.map((c) => c.name),
        startingPrice: r.services[0] ? { amount: r.services[0].priceAmount, currency: r.services[0].currency } : null,
        avgRating: rating?._avg.stars ?? null,
        ratingCount: rating?._count._all ?? 0,
      };
    }),
    total,
    page: query.page,
    pageSize: query.pageSize,
  });
}
