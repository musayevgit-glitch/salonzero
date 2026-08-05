import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../generated/client';

// Focused DB-level tests against the local Postgres instance (docs/architecture/data-model.md).
// Requires DATABASE_URL to point at a real database with migrations applied.
const prisma = new PrismaClient();

let salonId: string;
let serviceId: string;
let employeeId: string;
let customerId: string;

async function createReservation(overrides: {
  startAt: Date;
  endAt: Date;
  status?: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'REJECTED' | 'CANCELLED_BY_CUSTOMER';
}) {
  return prisma.reservation.create({
    data: {
      salonId,
      serviceId,
      employeeId,
      customerId,
      priceAmount: 3000,
      currency: 'AZN',
      startAt: overrides.startAt,
      endAt: overrides.endAt,
      status: overrides.status ?? 'PENDING',
    },
  });
}

beforeAll(async () => {
  const suffix = randomUUID();

  const salon = await prisma.salon.create({
    data: { slug: `test-salon-${suffix}`, name: 'Test Salon', timezone: 'Asia/Baku' },
  });
  salonId = salon.id;

  const service = await prisma.service.create({
    data: {
      salonId,
      name: 'Test Haircut',
      priceAmount: 3000,
      currency: 'AZN',
      durationMinutes: 30,
    },
  });
  serviceId = service.id;

  const employee = await prisma.employeeProfile.create({
    data: { salonId, fullName: 'Test Stylist' },
  });
  employeeId = employee.id;

  const customer = await prisma.user.create({
    data: { email: `customer-${suffix}@example.com`, passwordHash: 'x', fullName: 'Test Customer' },
  });
  customerId = customer.id;
});

afterAll(async () => {
  await prisma.reservation.deleteMany({ where: { salonId } });
  await prisma.employeeProfile.delete({ where: { id: employeeId } });
  await prisma.service.delete({ where: { id: serviceId } });
  await prisma.salon.delete({ where: { id: salonId } });
  await prisma.user.delete({ where: { id: customerId } });
  await prisma.$disconnect();
});

describe('tenant ownership', () => {
  it('requires salonId on tenant-owned tables (Service)', async () => {
    // Deliberately bypassing Prisma's generated types to prove the DB-level NOT NULL constraint
    // holds even if application code somehow skipped the compile-time check.
    const invalidData = {
      name: 'No salon',
      priceAmount: 100,
      currency: 'AZN',
      durationMinutes: 10,
    } as unknown as Parameters<typeof prisma.service.create>[0]['data'];

    await expect(prisma.service.create({ data: invalidData })).rejects.toThrow();
  });
});

describe('uniqueness constraints', () => {
  it('rejects a duplicate user email', async () => {
    const email = `dup-${randomUUID()}@example.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'x', fullName: 'First' },
    });
    await expect(
      prisma.user.create({ data: { email, passwordHash: 'x', fullName: 'Second' } }),
    ).rejects.toThrow();
    await prisma.user.delete({ where: { id: user.id } });
  });

  it('rejects a duplicate salon slug', async () => {
    const slug = `dup-slug-${randomUUID()}`;
    const salon = await prisma.salon.create({ data: { slug, name: 'A', timezone: 'UTC' } });
    await expect(
      prisma.salon.create({ data: { slug, name: 'B', timezone: 'UTC' } }),
    ).rejects.toThrow();
    await prisma.salon.delete({ where: { id: salon.id } });
  });

  it('rejects a second membership for the same user + salon', async () => {
    const user = await prisma.user.create({
      data: { email: `member-${randomUUID()}@example.com`, passwordHash: 'x', fullName: 'M' },
    });
    await prisma.salonMembership.create({
      data: { userId: user.id, salonId, role: 'SALON_ADMIN' },
    });
    await expect(
      prisma.salonMembership.create({ data: { userId: user.id, salonId, role: 'SALON_MANAGER' } }),
    ).rejects.toThrow();
    await prisma.salonMembership.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});

describe('deletion policy (Restrict)', () => {
  it('blocks deleting a salon that has a service', async () => {
    await expect(prisma.salon.delete({ where: { id: salonId } })).rejects.toThrow();
  });

  it('blocks deleting a service referenced by a reservation', async () => {
    const reservation = await createReservation({
      startAt: new Date('2030-01-01T10:00:00Z'),
      endAt: new Date('2030-01-01T10:30:00Z'),
    });
    await expect(prisma.service.delete({ where: { id: serviceId } })).rejects.toThrow();
    await prisma.reservation.delete({ where: { id: reservation.id } });
  });
});

describe('reservation overlap exclusion constraint (ADR-0005)', () => {
  it('rejects a second PENDING reservation overlapping the same employee/time range', async () => {
    const startAt = new Date('2030-02-01T10:00:00Z');
    const endAt = new Date('2030-02-01T10:30:00Z');
    const first = await createReservation({ startAt, endAt });

    await expect(createReservation({ startAt, endAt })).rejects.toThrow();

    await prisma.reservation.delete({ where: { id: first.id } });
  });

  it('allows a new reservation once the conflicting one is cancelled', async () => {
    const startAt = new Date('2030-02-02T10:00:00Z');
    const endAt = new Date('2030-02-02T10:30:00Z');
    const first = await createReservation({ startAt, endAt });

    await prisma.reservation.update({
      where: { id: first.id },
      data: { status: 'CANCELLED_BY_CUSTOMER' },
    });

    const second = await createReservation({ startAt, endAt });
    expect(second.id).not.toBe(first.id);

    await prisma.reservation.deleteMany({ where: { id: { in: [first.id, second.id] } } });
  });

  it('rejects startAt >= endAt', async () => {
    await expect(
      createReservation({
        startAt: new Date('2030-03-01T10:00:00Z'),
        endAt: new Date('2030-03-01T09:00:00Z'),
      }),
    ).rejects.toThrow();
  });
});
