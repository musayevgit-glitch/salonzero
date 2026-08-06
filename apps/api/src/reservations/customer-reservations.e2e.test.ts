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

// Monday 2026-08-10 10:00 UTC — matches working schedule created in setup
const SLOT_START = '2026-08-10T10:00:00.000Z';

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

async function registerCustomer(email: string) {
  const agent = request.agent(app.getHttpServer());
  const csrfRes = await agent.get('/health');
  const csrfToken = extractCsrfToken(csrfRes.headers['set-cookie']);
  const res = await agent
    .post('/auth/register')
    .set('x-csrf-token', csrfToken)
    .send({ email, password: 'longenoughpassword', fullName: 'Customer Res Test' });
  return { agent, userId: res.body.id as string, csrfToken };
}

async function setup(prefix: string) {
  const salon = await prisma.salon.create({
    data: {
      slug: `cust-res-${prefix}-${randomUUID()}`,
      name: `Customer Res ${prefix}`,
      timezone: 'UTC',
      bookingPolicy: {
        create: {
          autoConfirm: true,
          minNoticeMinutes: 0,
          maxAdvanceDays: 60,
          cancellationWindowHours: 2,
          rescheduleWindowHours: 2,
        },
      },
    },
  });
  const service = await prisma.service.create({
    data: {
      salonId: salon.id,
      name: 'Haircut',
      priceAmount: 3000,
      currency: 'USD',
      durationMinutes: 60,
      bufferMinutes: 0,
    },
  });
  const employee = await prisma.employeeProfile.create({
    data: { salonId: salon.id, fullName: 'Stylist', isActive: true },
  });
  await prisma.employeeService.create({ data: { employeeId: employee.id, serviceId: service.id } });
  await prisma.workingSchedule.create({
    data: {
      employeeId: employee.id,
      weekday: 1,
      startMinuteOfDay: 9 * 60,
      endMinuteOfDay: 17 * 60,
    },
  });
  const { agent, userId, csrfToken } = await registerCustomer(
    `cust-res-${prefix}-${randomUUID()}@example.com`,
  );
  // Create a reservation for the customer
  const resRes = await agent
    .post('/reservations')
    .set('x-csrf-token', csrfToken)
    .send({
      salonId: salon.id,
      serviceId: service.id,
      employeeId: employee.id,
      startAt: SLOT_START,
      idempotencyKey: randomUUID(),
    });
  expect(resRes.status).toBe(201);
  const reservationId: string = resRes.body.id;
  return { salon, service, employee, agent, customerId: userId, csrfToken, reservationId };
}

beforeAll(async () => {
  const env = validateApiEnv(process.env);
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  configureApp(app, env);
  await app.init();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await app.close();
});

describe('GET /customer/reservations', () => {
  it('requires authentication', async () => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent.get('/customer/reservations');
    expect(res.status).toBe(401);
  });

  it('returns paginated list for the authenticated customer', async () => {
    const { agent, reservationId } = await setup('list');
    const res = await agent.get('/customer/reservations');
    expect(res.status).toBe(200);
    expect(res.body.items).toBeInstanceOf(Array);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0]).toMatchObject({
      id: reservationId,
      status: 'CONFIRMED',
      service: { name: 'Haircut' },
      salon: expect.objectContaining({ name: expect.any(String) }),
    });
    // PII: employee phone/email must not appear in list response
    expect(res.body.items[0]).not.toHaveProperty('customer');
    expect(res.body.items[0]).not.toHaveProperty('employeeId');
  });

  it('does not return other customers reservations', async () => {
    const { reservationId } = await setup('isolation-owner');
    // Different customer
    const { agent: otherAgent } = await registerCustomer(
      `cust-res-other-${randomUUID()}@example.com`,
    );
    const res = await otherAgent.get('/customer/reservations');
    expect(res.status).toBe(200);
    const ids = (res.body.items as { id: string }[]).map((i) => i.id);
    expect(ids).not.toContain(reservationId);
  });

  it('returns empty list for a new customer with no reservations', async () => {
    const { agent: newAgent } = await registerCustomer(
      `cust-empty-${randomUUID()}@example.com`,
    );
    const res = await newAgent.get('/customer/reservations');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});

describe('GET /customer/reservations/:reservationId', () => {
  it('returns 401 without auth', async () => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent.get(`/customer/reservations/${randomUUID()}`);
    expect(res.status).toBe(401);
  });

  it('returns full detail for own reservation', async () => {
    const { agent, reservationId } = await setup('detail');
    const res = await agent.get(`/customer/reservations/${reservationId}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: reservationId,
      status: 'CONFIRMED',
      service: { name: 'Haircut', durationMinutes: 60 },
      salon: expect.objectContaining({ slug: expect.any(String), timezone: 'UTC' }),
    });
    expect(typeof res.body.canCancel).toBe('boolean');
    expect(typeof res.body.canReschedule).toBe('boolean');
  });

  it('returns 404 for guessed reservation ID (ownership check)', async () => {
    const { agent } = await setup('guessed-id');
    const res = await agent.get(`/customer/reservations/${randomUUID()}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 when accessing another customers reservation', async () => {
    const { reservationId } = await setup('cross-customer-owner');
    const { agent: otherAgent } = await registerCustomer(
      `cust-cross-${randomUUID()}@example.com`,
    );
    const res = await otherAgent.get(`/customer/reservations/${reservationId}`);
    expect(res.status).toBe(404);
  });
});
