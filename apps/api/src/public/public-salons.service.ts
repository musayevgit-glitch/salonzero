import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { StorageAdapter } from '@salonomia/storage';
import type { ListPublicSalonsQuery } from '@salonomia/validation';
import { Prisma } from '@salonomia/database';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_ADAPTER } from '../storage/storage.tokens';

export interface PublicSalonListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  genderFocus: string | null;
  startingPrice: { amount: number; currency: string } | null;
}

export interface PublicSalonDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  addressLine: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  genderFocus: string | null;
  bookingPolicySummary: {
    autoConfirm: boolean;
    cancellationWindowHours: number;
    rescheduleWindowHours: number;
    minNoticeMinutes: number;
    maxAdvanceDays: number;
  } | null;
  // Approximate: the union of active employees' working-schedule blocks per weekday (earliest
  // start to latest end). There is no dedicated salon-operating-hours model in the approved schema
  // (Section 8) — only per-employee WorkingSchedule — so this is a best-effort display value, not
  // an authoritative "the salon is open" guarantee. Documented as a risk in progress.md.
  approximateOpeningHours: { weekday: number; startMinuteOfDay: number; endMinuteOfDay: number }[];
  serviceCategories: {
    id: string;
    name: string;
    services: PublicService[];
  }[];
  uncategorizedServices: PublicService[];
  employees: {
    id: string;
    fullName: string;
    bio: string | null;
    portfolio: { id: string; imageUrl: string; caption: string | null }[];
  }[];
}

interface PublicService {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
}

const PUBLIC_SERVICE_SELECT = {
  id: true,
  name: true,
  description: true,
  priceAmount: true,
  currency: true,
  durationMinutes: true,
} as const;

@Injectable()
export class PublicSalonsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  async list(
    query: ListPublicSalonsQuery,
  ): Promise<{ items: PublicSalonListItem[]; total: number; page: number; pageSize: number }> {
    const priceFilter: Prisma.ServiceWhereInput = { isActive: true };
    if (query.minPrice !== undefined) priceFilter.priceAmount = { gte: query.minPrice };
    if (query.maxPrice !== undefined) {
      priceFilter.priceAmount = { ...(priceFilter.priceAmount as object), lte: query.maxPrice };
    }

    const where: Prisma.SalonWhereInput = {
      status: 'ACTIVE',
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
      ...(query.genderFocus ? { genderFocus: query.genderFocus } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? { services: { some: priceFilter } }
        : {}),
    };

    const orderBy: Prisma.SalonOrderByWithRelationInput =
      query.sort === 'name_desc'
        ? { name: 'desc' }
        : query.sort === 'newest'
          ? { createdAt: 'desc' }
          : { name: 'asc' };

    const [rows, total] = await Promise.all([
      this.prisma.salon.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          city: true,
          genderFocus: true,
          services: {
            where: { isActive: true },
            orderBy: { priceAmount: 'asc' },
            take: 1,
            select: { priceAmount: true, currency: true },
          },
        },
      }),
      this.prisma.salon.count({ where }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        city: r.city,
        genderFocus: r.genderFocus,
        startingPrice: r.services[0]
          ? { amount: r.services[0].priceAmount, currency: r.services[0].currency }
          : null,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async detail(slug: string): Promise<PublicSalonDetail> {
    const salon = await this.prisma.salon.findFirst({
      where: { slug, status: 'ACTIVE' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        addressLine: true,
        city: true,
        phone: true,
        email: true,
        genderFocus: true,
        bookingPolicy: {
          select: {
            autoConfirm: true,
            cancellationWindowHours: true,
            rescheduleWindowHours: true,
            minNoticeMinutes: true,
            maxAdvanceDays: true,
          },
        },
        serviceCategories: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            services: { where: { isActive: true }, orderBy: { name: 'asc' }, select: PUBLIC_SERVICE_SELECT },
          },
        },
        employees: {
          where: { isActive: true },
          orderBy: { fullName: 'asc' },
          select: {
            id: true,
            fullName: true,
            bio: true,
            portfolio: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, imageUrl: true, caption: true },
            },
            workingSchedules: { select: { weekday: true, startMinuteOfDay: true, endMinuteOfDay: true } },
          },
        },
      },
    });
    if (!salon) throw new NotFoundException();

    const uncategorizedServices = await this.prisma.service.findMany({
      where: { salonId: salon.id, isActive: true, categoryId: null },
      orderBy: { name: 'asc' },
      select: PUBLIC_SERVICE_SELECT,
    });

    const employees = await Promise.all(
      salon.employees.map(async (e) => ({
        id: e.id,
        fullName: e.fullName,
        bio: e.bio,
        portfolio: await Promise.all(
          e.portfolio.map(async (p) => ({
            id: p.id,
            imageUrl: await this.storage.getObjectUrl(p.imageUrl),
            caption: p.caption,
          })),
        ),
      })),
    );

    const openingHoursByWeekday = new Map<number, { startMinuteOfDay: number; endMinuteOfDay: number }>();
    for (const employee of salon.employees) {
      for (const block of employee.workingSchedules) {
        const existing = openingHoursByWeekday.get(block.weekday);
        if (!existing) {
          openingHoursByWeekday.set(block.weekday, {
            startMinuteOfDay: block.startMinuteOfDay,
            endMinuteOfDay: block.endMinuteOfDay,
          });
        } else {
          existing.startMinuteOfDay = Math.min(existing.startMinuteOfDay, block.startMinuteOfDay);
          existing.endMinuteOfDay = Math.max(existing.endMinuteOfDay, block.endMinuteOfDay);
        }
      }
    }
    const approximateOpeningHours = [...openingHoursByWeekday.entries()]
      .map(([weekday, hours]) => ({ weekday, ...hours }))
      .sort((a, b) => a.weekday - b.weekday);

    return {
      id: salon.id,
      slug: salon.slug,
      name: salon.name,
      description: salon.description,
      addressLine: salon.addressLine,
      city: salon.city,
      phone: salon.phone,
      email: salon.email,
      genderFocus: salon.genderFocus,
      bookingPolicySummary: salon.bookingPolicy,
      approximateOpeningHours,
      serviceCategories: salon.serviceCategories,
      uncategorizedServices,
      employees,
    };
  }
}
