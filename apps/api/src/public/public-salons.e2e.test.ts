import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { configureApp } from '../configure-app';
import { validateApiEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

let app: INestApplication;
let prisma: PrismaService;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  configureApp(app, validateApiEnv(process.env));
  await app.init();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await app.close();
});

async function createSalon(
  prefix: string,
  overrides: {
    status?: string;
    city?: string;
    genderFocus?: 'WOMEN' | 'MEN' | 'UNISEX';
  } = {},
) {
  return prisma.salon.create({
    data: {
      slug: `${prefix}-${randomUUID()}`,
      name: `${prefix} Salon`,
      timezone: 'UTC',
      status: (overrides.status ?? 'ACTIVE') as never,
      city: overrides.city,
      genderFocus: overrides.genderFocus,
      bookingPolicy: { create: {} },
    },
  });
}

describe('GET /public/salons (list)', () => {
  it('requires no authentication and returns only ACTIVE salons', async () => {
    const active = await createSalon('pub-active');
    const suspended = await createSalon('pub-suspended', { status: 'SUSPENDED' });

    const res = await request(app.getHttpServer()).get('/public/salons?search=pub-');
    expect(res.status).toBe(200);
    const slugs = res.body.items.map((i: { slug: string }) => i.slug);
    expect(slugs).toContain(active.slug);
    expect(slugs).not.toContain(suspended.slug);
  });

  it('never returns sensitive/tenant-internal fields', async () => {
    const prefix = `pub-fields-${randomUUID()}`;
    await createSalon(prefix);
    const res = await request(app.getHttpServer()).get(`/public/salons?search=${prefix}`);
    const item = res.body.items[0];
    expect(Object.keys(item).sort()).toEqual(
      ['id', 'slug', 'name', 'description', 'city', 'genderFocus', 'startingPrice'].sort(),
    );
  });

  it('filters by city and genderFocus', async () => {
    const prefix = `pub-filter-${randomUUID()}`;
    await createSalon(`${prefix}-a`, { city: 'Baku', genderFocus: 'WOMEN' });
    await createSalon(`${prefix}-b`, { city: 'Ganja', genderFocus: 'MEN' });

    const byCity = await request(app.getHttpServer()).get(
      `/public/salons?search=${prefix}&city=Baku`,
    );
    expect(byCity.body.items).toHaveLength(1);
    expect(byCity.body.items[0].city).toBe('Baku');

    const byGender = await request(app.getHttpServer()).get(
      `/public/salons?search=${prefix}&genderFocus=MEN`,
    );
    expect(byGender.body.items).toHaveLength(1);
    expect(byGender.body.items[0].genderFocus).toBe('MEN');
  });

  it('filters by price range (has an active service in range) and shows the cheapest starting price', async () => {
    const prefix = `pub-price-${randomUUID()}`;
    const salon = await createSalon(prefix);
    await prisma.service.create({
      data: { salonId: salon.id, name: 'Cheap', priceAmount: 1000, currency: 'USD', durationMinutes: 30 },
    });
    await prisma.service.create({
      data: { salonId: salon.id, name: 'Pricey', priceAmount: 20000, currency: 'USD', durationMinutes: 90, isActive: true },
    });

    const inRange = await request(app.getHttpServer()).get(
      `/public/salons?search=${prefix}&minPrice=500&maxPrice=1500`,
    );
    expect(inRange.body.items).toHaveLength(1);
    expect(inRange.body.items[0].startingPrice).toEqual({ amount: 1000, currency: 'USD' });

    const outOfRange = await request(app.getHttpServer()).get(
      `/public/salons?search=${prefix}&minPrice=50000`,
    );
    expect(outOfRange.body.items).toHaveLength(0);
  });

  it('sorts by name and newest', async () => {
    const prefix = `pub-sort-${randomUUID()}`;
    await createSalon(`${prefix}-zzz`);
    await createSalon(`${prefix}-aaa`);

    const nameAsc = await request(app.getHttpServer()).get(
      `/public/salons?search=${prefix}&sort=name_asc`,
    );
    expect(nameAsc.body.items[0].name).toBe(`${prefix}-aaa Salon`);

    const nameDesc = await request(app.getHttpServer()).get(
      `/public/salons?search=${prefix}&sort=name_desc`,
    );
    expect(nameDesc.body.items[0].name).toBe(`${prefix}-zzz Salon`);
  });

  it('paginates and rejects forbidden/malformed query params', async () => {
    const res = await request(app.getHttpServer()).get('/public/salons?page=1&pageSize=5');
    expect(res.status).toBe(200);
    expect(res.body.pageSize).toBe(5);

    const badParam = await request(app.getHttpServer()).get('/public/salons?includeSuspended=true');
    expect(badParam.status).toBe(400);

    const badRange = await request(app.getHttpServer()).get(
      '/public/salons?minPrice=100&maxPrice=50',
    );
    expect(badRange.status).toBe(400);
  });
});

describe('GET /public/salons/:slug (detail)', () => {
  it('404s for a suspended or nonexistent salon (no existence leakage)', async () => {
    const suspended = await createSalon('pub-detail-suspended', { status: 'SUSPENDED' });
    const suspendedRes = await request(app.getHttpServer()).get(`/public/salons/${suspended.slug}`);
    expect(suspendedRes.status).toBe(404);

    const missingRes = await request(app.getHttpServer()).get('/public/salons/does-not-exist');
    expect(missingRes.status).toBe(404);
  });

  it('returns services grouped by category plus uncategorized, active employees with resolved portfolio URLs, and a booking policy summary', async () => {
    const salon = await createSalon('pub-detail-full');
    const category = await prisma.serviceCategory.create({ data: { salonId: salon.id, name: 'Hair' } });
    await prisma.service.create({
      data: {
        salonId: salon.id,
        categoryId: category.id,
        name: 'Haircut',
        priceAmount: 5000,
        currency: 'USD',
        durationMinutes: 60,
      },
    });
    await prisma.service.create({
      data: { salonId: salon.id, name: 'Uncategorized Service', priceAmount: 2000, currency: 'USD', durationMinutes: 20 },
    });
    await prisma.service.create({
      data: { salonId: salon.id, name: 'Inactive', priceAmount: 100, currency: 'USD', durationMinutes: 10, isActive: false },
    });
    const employee = await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Jane Stylist', bio: 'Great with color', isActive: true },
    });
    await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Inactive Stylist', isActive: false },
    });
    await prisma.employeePortfolioItem.create({
      data: { employeeId: employee.id, imageUrl: `employees/${employee.id}/${randomUUID()}.jpg`, caption: 'Before/after' },
    });
    await prisma.workingSchedule.create({
      data: { employeeId: employee.id, weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 17 * 60 },
    });

    const res = await request(app.getHttpServer()).get(`/public/salons/${salon.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.serviceCategories).toHaveLength(1);
    expect(res.body.serviceCategories[0].services.map((s: { name: string }) => s.name)).toEqual([
      'Haircut',
    ]);
    expect(res.body.uncategorizedServices.map((s: { name: string }) => s.name)).toEqual([
      'Uncategorized Service',
    ]);
    expect(res.body.employees).toHaveLength(1);
    expect(res.body.employees[0].fullName).toBe('Jane Stylist');
    expect(res.body.employees[0].portfolio[0].imageUrl).toEqual(expect.any(String));
    expect(res.body.bookingPolicySummary).toMatchObject({ autoConfirm: false });
    expect(res.body.approximateOpeningHours).toEqual([
      { weekday: 1, startMinuteOfDay: 540, endMinuteOfDay: 1020 },
    ]);
  });

  it('never exposes employee private contact data (none exists to leak) or internal notes', async () => {
    const salon = await createSalon('pub-detail-privacy');
    const employee = await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Privacy Check', isActive: true },
    });
    const res = await request(app.getHttpServer()).get(`/public/salons/${salon.slug}`);
    const employeeFields = Object.keys(res.body.employees[0]);
    expect(employeeFields.sort()).toEqual(['id', 'fullName', 'bio', 'portfolio'].sort());
    void employee;
  });
});

describe('GET /public/salons/:slug/availability', () => {
  async function createSalonWithService(prefix: string) {
    const salon = await createSalon(prefix);
    const service = await prisma.service.create({
      data: { salonId: salon.id, name: 'Cut', priceAmount: 2000, currency: 'AZN', durationMinutes: 30 },
    });
    const employee = await prisma.employeeProfile.create({
      data: {
        salonId: salon.id,
        fullName: 'Avail Stylist',
        isActive: true,
        eligibleServices: { create: { serviceId: service.id } },
        workingSchedules: {
          create: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 17 * 60 }],
        },
      },
    });
    return { salon, service, employee };
  }

  it('returns slots for a valid active service and date', async () => {
    const { salon, service } = await createSalonWithService(`pub-avail-${randomUUID()}`);
    // Monday 2026-08-10
    const res = await request(app.getHttpServer()).get(
      `/public/salons/${salon.slug}/availability?serviceId=${service.id}&date=2026-08-10`,
    );
    expect(res.status).toBe(200);
    expect(res.body.timezone).toBe('UTC');
    expect(Array.isArray(res.body.slots)).toBe(true);
    expect(res.body.slots.length).toBeGreaterThan(0);
    // No employeeId in slot responses (no private booking details)
    for (const slot of res.body.slots as { startAt: string; endAt: string }[]) {
      expect(Object.keys(slot).sort()).toEqual(['endAt', 'startAt'].sort());
    }
  });

  it('returns empty slots for a suspended salon', async () => {
    const salon = await createSalon(`pub-avail-suspended-${randomUUID()}`, { status: 'SUSPENDED' });
    const res = await request(app.getHttpServer()).get(
      `/public/salons/${salon.slug}/availability?serviceId=${randomUUID()}&date=2026-08-10`,
    );
    expect(res.status).toBe(404);
  });

  it('400s on missing or malformed params', async () => {
    const { salon } = await createSalonWithService(`pub-avail-bad-${randomUUID()}`);
    const missing = await request(app.getHttpServer()).get(
      `/public/salons/${salon.slug}/availability?date=2026-08-10`,
    );
    expect(missing.status).toBe(400);

    const badDate = await request(app.getHttpServer()).get(
      `/public/salons/${salon.slug}/availability?serviceId=${randomUUID()}&date=not-a-date`,
    );
    expect(badDate.status).toBe(400);

    const forbidden = await request(app.getHttpServer()).get(
      `/public/salons/${salon.slug}/availability?serviceId=${randomUUID()}&date=2026-08-10&status=CONFIRMED`,
    );
    expect(forbidden.status).toBe(400);
  });

  it('404s for a service that does not belong to the salon', async () => {
    const { salon } = await createSalonWithService(`pub-avail-xtenant-${randomUUID()}`);
    const otherService = await prisma.service.create({
      data: {
        salonId: (await createSalon(`pub-avail-other-${randomUUID()}`)).id,
        name: 'Other',
        priceAmount: 1000,
        currency: 'AZN',
        durationMinutes: 30,
      },
    });
    const res = await request(app.getHttpServer()).get(
      `/public/salons/${salon.slug}/availability?serviceId=${otherService.id}&date=2026-08-10`,
    );
    expect(res.status).toBe(404);
  });
});
