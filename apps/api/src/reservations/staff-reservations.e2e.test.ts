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

function extractCsrfToken(setCookieHeader: string | string[] | undefined): string {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];
  const token = cookies
    .find((c) => c.startsWith('csrfToken='))
    ?.split(';')[0]
    ?.split('=')[1];
  if (!token) throw new Error('csrfToken cookie was not issued');
  return token;
}

async function registerUser(email: string) {
  const agent = request.agent(app.getHttpServer());
  const csrfRes = await agent.get('/health');
  const csrfToken = extractCsrfToken(csrfRes.headers['set-cookie']);
  const res = await agent
    .post('/auth/register')
    .set('x-csrf-token', csrfToken)
    .send({ email, password: 'longenoughpassword', fullName: 'Staff List Test' });
  return { agent, userId: res.body.id as string, csrfToken };
}

async function registerAsRole(
  email: string,
  salonId: string,
  role: 'SALON_ADMIN' | 'SALON_MANAGER',
) {
  const { agent, userId, csrfToken } = await registerUser(email);
  await prisma.salonMembership.create({ data: { userId, salonId, role } });
  return { agent, userId, csrfToken };
}

async function setup(prefix: string) {
  const salon = await prisma.salon.create({
    data: {
      slug: `${prefix}-${randomUUID()}`,
      name: prefix,
      timezone: 'UTC',
      bookingPolicy: { create: {} },
    },
  });
  const service = await prisma.service.create({
    data: {
      salonId: salon.id,
      name: 'Haircut',
      priceAmount: 5000,
      currency: 'USD',
      durationMinutes: 60,
    },
  });
  const employee = await prisma.employeeProfile.create({
    data: { salonId: salon.id, fullName: 'Stylist', isActive: true },
  });
  const customer = await prisma.user.create({
    data: {
      email: `cust-${randomUUID()}@example.com`,
      passwordHash: 'x',
      fullName: 'Alice Customer',
    },
  });
  const { agent, csrfToken } = await registerAsRole(
    `${prefix}-admin-${randomUUID()}@example.com`,
    salon.id,
    'SALON_ADMIN',
  );
  return { salon, service, employee, customer, agent, csrfToken };
}

async function createReservation(
  salonId: string,
  serviceId: string,
  employeeId: string,
  customerId: string,
  status: string,
  startAt: Date,
) {
  return prisma.reservation.create({
    data: {
      salonId,
      serviceId,
      employeeId,
      customerId,
      status: status as never,
      startAt,
      endAt: new Date(startAt.getTime() + 60 * 60_000),
      blockedUntil: new Date(startAt.getTime() + 60 * 60_000),
      priceAmount: 5000,
      currency: 'USD',
    },
  });
}

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

describe('GET /salons/:salonId/reservations (staff list)', () => {
  it('rejects an unauthenticated request', async () => {
    const { salon } = await setup('list-unauth');
    const res = await request(app.getHttpServer()).get(`/salons/${salon.id}/reservations`);
    expect(res.status).toBe(401);
  });

  it('denies SALON_MANAGER... no wait, allows SALON_MANAGER; denies a plain authenticated user', async () => {
    const { salon } = await setup('list-role');
    const { agent: managerAgent, csrfToken: managerCsrf } = await registerAsRole(
      `list-manager-${randomUUID()}@example.com`,
      salon.id,
      'SALON_MANAGER',
    );
    const managerRes = await managerAgent.get(`/salons/${salon.id}/reservations`);
    expect(managerRes.status).toBe(200);
    void managerCsrf;

    const { agent: plainAgent } = await registerUser(`list-plain-${randomUUID()}@example.com`);
    const plainRes = await plainAgent.get(`/salons/${salon.id}/reservations`);
    expect(plainRes.status).toBe(404);
  });

  it('lists reservations for the salon with joined service/employee/customer and availableActions', async () => {
    const { salon, service, employee, customer, agent } = await setup('list-basic');
    await createReservation(
      salon.id,
      service.id,
      employee.id,
      customer.id,
      'PENDING',
      new Date('2026-08-10T10:00:00.000Z'),
    );

    const res = await agent.get(`/salons/${salon.id}/reservations`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    const item = res.body.items[0];
    expect(item.service.name).toBe('Haircut');
    expect(item.employee.fullName).toBe('Stylist');
    // SEC-002: staff list returns customer email (their booking data) but not fullName/id
    expect(item.customer.email).toBeDefined();
    expect(item.customer.fullName).toBeUndefined();
    expect(item.customer.id).toBeUndefined();
    expect(item.availableActions.sort()).toEqual(
      ['cancel', 'confirm', 'reject', 'reschedule'].sort(),
    );
  });

  it('never leaks another salon’s reservations (cross-tenant scoping)', async () => {
    const { salon: salonA, service, employee, customer, agent } = await setup('list-crossA');
    const {
      salon: salonB,
      service: serviceB,
      employee: employeeB,
      customer: customerB,
    } = await setup('list-crossB');
    await createReservation(
      salonA.id,
      service.id,
      employee.id,
      customer.id,
      'PENDING',
      new Date('2026-08-10T10:00:00.000Z'),
    );
    await createReservation(
      salonB.id,
      serviceB.id,
      employeeB.id,
      customerB.id,
      'PENDING',
      new Date('2026-08-10T10:00:00.000Z'),
    );

    const res = await agent.get(`/salons/${salonA.id}/reservations`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);

    const crossRes = await agent.get(`/salons/${salonB.id}/reservations`);
    expect(crossRes.status).toBe(404);
  });

  it('filters by date range (from/to), status, and employeeId', async () => {
    const { salon, service, employee, customer, agent } = await setup('list-filters');
    await createReservation(
      salon.id,
      service.id,
      employee.id,
      customer.id,
      'PENDING',
      new Date('2026-08-10T10:00:00.000Z'),
    );
    await createReservation(
      salon.id,
      service.id,
      employee.id,
      customer.id,
      'CONFIRMED',
      new Date('2026-08-11T10:00:00.000Z'),
    );

    const dayOne = await agent.get(
      `/salons/${salon.id}/reservations?from=2026-08-10T00:00:00.000Z&to=2026-08-11T00:00:00.000Z`,
    );
    expect(dayOne.body.items).toHaveLength(1);
    expect(dayOne.body.items[0].status).toBe('PENDING');

    const confirmedOnly = await agent.get(`/salons/${salon.id}/reservations?status=CONFIRMED`);
    expect(confirmedOnly.body.items).toHaveLength(1);
    expect(confirmedOnly.body.items[0].status).toBe('CONFIRMED');

    const byEmployee = await agent.get(
      `/salons/${salon.id}/reservations?employeeId=${employee.id}`,
    );
    expect(byEmployee.body.items).toHaveLength(2);
  });

  it('searches by customer name or email', async () => {
    const { salon, service, employee, customer, agent } = await setup('list-search');
    await createReservation(
      salon.id,
      service.id,
      employee.id,
      customer.id,
      'PENDING',
      new Date('2026-08-10T10:00:00.000Z'),
    );

    const byName = await agent.get(`/salons/${salon.id}/reservations?search=Alice`);
    expect(byName.body.items).toHaveLength(1);

    const byEmail = await agent.get(
      `/salons/${salon.id}/reservations?search=${encodeURIComponent(customer.email)}`,
    );
    expect(byEmail.body.items).toHaveLength(1);

    const noMatch = await agent.get(`/salons/${salon.id}/reservations?search=nobody-matches-this`);
    expect(noMatch.body.items).toHaveLength(0);
  });

  it('rejects a forbidden/unknown query param', async () => {
    const { salon, agent } = await setup('list-badquery');
    const res = await agent.get(`/salons/${salon.id}/reservations?statuz=PENDING`);
    expect(res.status).toBe(400);
  });
});

describe('GET /salons/:salonId/reservations/:reservationId (staff detail)', () => {
  it('returns the reservation with availableActions reflecting CHECKED_IN (complete only)', async () => {
    const { salon, service, employee, customer, agent } = await setup('detail-checkedin');
    const reservation = await createReservation(
      salon.id,
      service.id,
      employee.id,
      customer.id,
      'CHECKED_IN',
      new Date('2026-08-10T10:00:00.000Z'),
    );
    const res = await agent.get(`/salons/${salon.id}/reservations/${reservation.id}`);
    expect(res.status).toBe(200);
    expect(res.body.availableActions).toEqual(['complete']);
  });

  it('returns no actions for a terminal reservation', async () => {
    const { salon, service, employee, customer, agent } = await setup('detail-terminal');
    const reservation = await createReservation(
      salon.id,
      service.id,
      employee.id,
      customer.id,
      'COMPLETED',
      new Date('2026-08-10T10:00:00.000Z'),
    );
    const res = await agent.get(`/salons/${salon.id}/reservations/${reservation.id}`);
    expect(res.body.availableActions).toEqual([]);
  });

  it('includes noShow only once the appointment end time has passed', async () => {
    const { salon, service, employee, customer, agent } = await setup('detail-noshow-window');
    const past = new Date('2020-01-01T10:00:00.000Z');
    const reservation = await createReservation(
      salon.id,
      service.id,
      employee.id,
      customer.id,
      'CONFIRMED',
      past,
    );
    const res = await agent.get(`/salons/${salon.id}/reservations/${reservation.id}`);
    expect(res.body.availableActions).toContain('noShow');

    const future = await createReservation(
      salon.id,
      service.id,
      employee.id,
      customer.id,
      'CONFIRMED',
      new Date(Date.now() + 24 * 60 * 60_000),
    );
    const futureRes = await agent.get(`/salons/${salon.id}/reservations/${future.id}`);
    expect(futureRes.body.availableActions).not.toContain('noShow');
  });

  it('404s for a reservation belonging to another salon (IDOR)', async () => {
    const { salon: salonA, agent } = await setup('detail-idorA');
    const { salon: salonB, service, employee, customer } = await setup('detail-idorB');
    const reservation = await createReservation(
      salonB.id,
      service.id,
      employee.id,
      customer.id,
      'PENDING',
      new Date('2026-08-10T10:00:00.000Z'),
    );
    const res = await agent.get(`/salons/${salonA.id}/reservations/${reservation.id}`);
    expect(res.status).toBe(404);
  });

  it('404s for a malformed/nonexistent reservation id', async () => {
    const { salon, agent } = await setup('detail-notfound');
    expect((await agent.get(`/salons/${salon.id}/reservations/not-a-uuid`)).status).toBe(404);
    expect((await agent.get(`/salons/${salon.id}/reservations/${randomUUID()}`)).status).toBe(404);
  });
});

describe('GET /salons/:salonId/reservations/booking-options', () => {
  it('rejects an unauthenticated request and a plain authenticated user', async () => {
    const { salon, agent } = await setup('bookopts-role');
    const unauth = await request(app.getHttpServer()).get(
      `/salons/${salon.id}/reservations/booking-options`,
    );
    expect(unauth.status).toBe(401);

    const { agent: plainAgent } = await registerUser(`bookopts-plain-${randomUUID()}@example.com`);
    const plainRes = await plainAgent.get(`/salons/${salon.id}/reservations/booking-options`);
    expect(plainRes.status).toBe(404);

    void agent;
  });

  it('allows SALON_MANAGER and returns only active services/employees for this salon', async () => {
    const { salon } = await setup('bookopts-manager');
    await prisma.service.create({
      data: {
        salonId: salon.id,
        name: 'Inactive Service',
        priceAmount: 100,
        currency: 'USD',
        durationMinutes: 30,
        isActive: false,
      },
    });
    await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Inactive Stylist', isActive: false },
    });
    const { agent: managerAgent } = await registerAsRole(
      `bookopts-manager2-${randomUUID()}@example.com`,
      salon.id,
      'SALON_MANAGER',
    );

    const res = await managerAgent.get(`/salons/${salon.id}/reservations/booking-options`);
    expect(res.status).toBe(200);
    expect(res.body.services).toHaveLength(1);
    expect(res.body.services[0].name).toBe('Haircut');
    expect(res.body.employees).toHaveLength(1);
    expect(res.body.employees[0].fullName).toBe('Stylist');
  });

  it('never returns another salon’s services/employees', async () => {
    const { salon: salonA, agent } = await setup('bookopts-crossA');
    await setup('bookopts-crossB');

    const res = await agent.get(`/salons/${salonA.id}/reservations/booking-options`);
    expect(res.body.services).toHaveLength(1);
    expect(res.body.employees).toHaveLength(1);
  });
});
