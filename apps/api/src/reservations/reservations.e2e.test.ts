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

async function registerCustomer(email: string) {
  const agent = request.agent(app.getHttpServer());
  const csrfRes = await agent.get('/health');
  const csrfToken = extractCsrfToken(csrfRes.headers['set-cookie']);
  const res = await agent
    .post('/auth/register')
    .set('x-csrf-token', csrfToken)
    .send({ email, password: 'longenoughpassword', fullName: 'Reservation Test' });
  return { agent, userId: res.body.id as string, csrfToken };
}

interface SetupOptions {
  autoConfirm?: boolean;
  minNoticeMinutes?: number;
  maxAdvanceDays?: number;
}

async function setup(prefix: string, options: SetupOptions = {}) {
  const salon = await prisma.salon.create({
    data: {
      slug: `${prefix}-${randomUUID()}`,
      name: prefix,
      timezone: 'UTC',
      bookingPolicy: {
        create: {
          autoConfirm: options.autoConfirm ?? false,
          minNoticeMinutes: options.minNoticeMinutes ?? 0,
          maxAdvanceDays: options.maxAdvanceDays ?? 60,
        },
      },
    },
  });
  const service = await prisma.service.create({
    data: {
      salonId: salon.id,
      name: 'Haircut',
      priceAmount: 5000,
      currency: 'USD',
      durationMinutes: 60,
      bufferMinutes: 0,
    },
  });
  const employee = await prisma.employeeProfile.create({
    data: { salonId: salon.id, fullName: 'Stylist', isActive: true },
  });
  await prisma.employeeService.create({ data: { employeeId: employee.id, serviceId: service.id } });
  // Monday 9:00-17:00 (2026-08-10 is a Monday), covers the test slots used below.
  await prisma.workingSchedule.create({
    data: {
      employeeId: employee.id,
      weekday: 1,
      startMinuteOfDay: 9 * 60,
      endMinuteOfDay: 17 * 60,
    },
  });

  const { agent, userId, csrfToken } = await registerCustomer(
    `${prefix}-customer-${randomUUID()}@example.com`,
  );
  return { salon, service, employee, agent, customerId: userId, csrfToken };
}

const SLOT_START = '2026-08-10T10:00:00.000Z';

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

describe('POST /reservations (customer booking creation)', () => {
  it('rejects an unauthenticated request', async () => {
    // Prime the CSRF cookie first (matching real client behavior) so this actually exercises
    // AuthenticatedGuard's 401 rather than CsrfGuard's 403, which runs first on an unprimed request.
    const agent = request.agent(app.getHttpServer());
    const csrfRes = await agent.get('/health');
    const csrfToken = extractCsrfToken(csrfRes.headers['set-cookie']);
    const res = await agent.post('/reservations').set('x-csrf-token', csrfToken).send({
      salonId: randomUUID(),
      serviceId: randomUUID(),
      startAt: SLOT_START,
      idempotencyKey: randomUUID(),
    });
    expect(res.status).toBe(401);
  });

  it('creates a PENDING reservation under manual-approval policy, with audit and notification', async () => {
    const { salon, service, employee, agent, customerId, csrfToken } = await setup('res-pending');

    const res = await agent.post('/reservations').set('x-csrf-token', csrfToken).send({
      salonId: salon.id,
      serviceId: service.id,
      employeeId: employee.id,
      startAt: SLOT_START,
      idempotencyKey: randomUUID(),
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.employeeId).toBe(employee.id);
    expect(res.body.priceAmount).toBe(5000); // from Service, never the client
    expect(res.body.currency).toBe('USD');
    expect(res.body.startAt).toBe(SLOT_START);
    expect(res.body.endAt).toBe('2026-08-10T11:00:00.000Z'); // startAt + 60min duration

    const stored = await prisma.reservation.findUnique({ where: { id: res.body.id } });
    expect(stored?.customerId).toBe(customerId); // session identity, not client-supplied

    const historyRow = await prisma.reservationStatusHistory.findFirst({
      where: { reservationId: res.body.id },
    });
    expect(historyRow?.fromStatus).toBeNull();
    expect(historyRow?.toStatus).toBe('PENDING');
    expect(historyRow?.changedByUserId).toBe(customerId);

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: customerId, action: 'reservation.created', targetId: res.body.id },
    });
    expect(auditRow).not.toBeNull();

    const notification = await prisma.notification.findFirst({
      where: { userId: customerId, type: 'reservation.pending_customer' },
    });
    expect(notification).not.toBeNull();
  });

  it('creates a CONFIRMED reservation under auto-confirm policy', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('res-autoconfirm', {
      autoConfirm: true,
    });
    const res = await agent.post('/reservations').set('x-csrf-token', csrfToken).send({
      salonId: salon.id,
      serviceId: service.id,
      employeeId: employee.id,
      startAt: SLOT_START,
      idempotencyKey: randomUUID(),
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('CONFIRMED');

    const notification = await prisma.notification.findFirst({
      where: {
        userId: (await prisma.reservation.findUnique({ where: { id: res.body.id } }))!.customerId,
      },
    });
    expect(notification?.type).toBe('reservation.confirmed');
  });

  it('resolves "any suitable stylist" when employeeId is omitted', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('res-any-stylist');
    const res = await agent
      .post('/reservations')
      .set('x-csrf-token', csrfToken)
      .send({
        salonId: salon.id,
        serviceId: service.id,
        startAt: SLOT_START,
        idempotencyKey: randomUUID(),
      });
    expect(res.status).toBe(201);
    expect(res.body.employeeId).toBe(employee.id);
  });

  it('rejects a nonexistent or inactive salon', async () => {
    const { agent, csrfToken } = await setup('res-badsalon-setup');
    const res = await agent.post('/reservations').set('x-csrf-token', csrfToken).send({
      salonId: randomUUID(),
      serviceId: randomUUID(),
      startAt: SLOT_START,
      idempotencyKey: randomUUID(),
    });
    expect(res.status).toBe(404);
  });

  it('rejects a serviceId that does not belong to the salon', async () => {
    const { salon, agent, csrfToken } = await setup('res-badserviceA');
    const { service: otherService } = await setup('res-badserviceB');
    const res = await agent.post('/reservations').set('x-csrf-token', csrfToken).send({
      salonId: salon.id,
      serviceId: otherService.id,
      startAt: SLOT_START,
      idempotencyKey: randomUUID(),
    });
    expect(res.status).toBe(400);
  });

  it('rejects an inactive service', async () => {
    const { salon, service, agent, csrfToken } = await setup('res-inactivesvc');
    await prisma.service.update({ where: { id: service.id }, data: { isActive: false } });
    const res = await agent
      .post('/reservations')
      .set('x-csrf-token', csrfToken)
      .send({
        salonId: salon.id,
        serviceId: service.id,
        startAt: SLOT_START,
        idempotencyKey: randomUUID(),
      });
    expect(res.status).toBe(400);
  });

  it('rejects an employeeId that does not belong to the salon', async () => {
    const { salon, service, agent, csrfToken } = await setup('res-badempA');
    const { employee: otherEmployee } = await setup('res-badempB');
    const res = await agent.post('/reservations').set('x-csrf-token', csrfToken).send({
      salonId: salon.id,
      serviceId: service.id,
      employeeId: otherEmployee.id,
      startAt: SLOT_START,
      idempotencyKey: randomUUID(),
    });
    expect(res.status).toBe(400);
  });

  it('rejects an employeeId not eligible for the requested service', async () => {
    const { salon, service, agent, csrfToken } = await setup('res-ineligible');
    const ineligibleEmployee = await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Other Stylist', isActive: true },
    });
    const res = await agent.post('/reservations').set('x-csrf-token', csrfToken).send({
      salonId: salon.id,
      serviceId: service.id,
      employeeId: ineligibleEmployee.id,
      startAt: SLOT_START,
      idempotencyKey: randomUUID(),
    });
    expect(res.status).toBe(400);
  });

  it('rejects an inactive employee', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('res-inactiveemp');
    await prisma.employeeProfile.update({ where: { id: employee.id }, data: { isActive: false } });
    const res = await agent.post('/reservations').set('x-csrf-token', csrfToken).send({
      salonId: salon.id,
      serviceId: service.id,
      employeeId: employee.id,
      startAt: SLOT_START,
      idempotencyKey: randomUUID(),
    });
    expect(res.status).toBe(400);
  });

  it('rejects when no eligible employee exists at all for "any suitable stylist"', async () => {
    const salon = await prisma.salon.create({
      data: {
        slug: `res-noone-${randomUUID()}`,
        name: 'res-noone',
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
    const { agent, csrfToken } = await registerCustomer(
      `res-noone-cust-${randomUUID()}@example.com`,
    );
    const res = await agent
      .post('/reservations')
      .set('x-csrf-token', csrfToken)
      .send({
        salonId: salon.id,
        serviceId: service.id,
        startAt: SLOT_START,
        idempotencyKey: randomUUID(),
      });
    expect(res.status).toBe(400);
  });

  it('rejects a slot outside the employee working schedule', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('res-outside-hours');
    const res = await agent.post('/reservations').set('x-csrf-token', csrfToken).send({
      salonId: salon.id,
      serviceId: service.id,
      employeeId: employee.id,
      startAt: '2026-08-10T20:00:00.000Z', // 8pm, outside 9-17 schedule
      idempotencyKey: randomUUID(),
    });
    expect(res.status).toBe(409);
  });

  it('rejects a booking within an inadequate minimum-notice window, with a generic conflict message', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('res-notice', {
      minNoticeMinutes: 60 * 24 * 365, // effectively "far future only"
    });
    const res = await agent.post('/reservations').set('x-csrf-token', csrfToken).send({
      salonId: salon.id,
      serviceId: service.id,
      employeeId: employee.id,
      startAt: SLOT_START,
      idempotencyKey: randomUUID(),
    });
    expect(res.status).toBe(409);
    expect(res.body.message).not.toMatch(/notice|policy/i); // privacy-safe: no internal-policy leakage
  });

  it('rejects overlapping an existing active reservation, without leaking who holds it', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('res-conflict');
    const first = await agent.post('/reservations').set('x-csrf-token', csrfToken).send({
      salonId: salon.id,
      serviceId: service.id,
      employeeId: employee.id,
      startAt: SLOT_START,
      idempotencyKey: randomUUID(),
    });
    expect(first.status).toBe(201);

    const { agent: otherAgent, csrfToken: otherCsrf } = await registerCustomer(
      `res-conflict-other-${randomUUID()}@example.com`,
    );
    const second = await otherAgent.post('/reservations').set('x-csrf-token', otherCsrf).send({
      salonId: salon.id,
      serviceId: service.id,
      employeeId: employee.id,
      startAt: SLOT_START,
      idempotencyKey: randomUUID(),
    });
    expect(second.status).toBe(409);
    expect(second.body.message).not.toMatch(/customer|user|email/i);
  });

  it('rejects malformed/boundary input', async () => {
    const { salon, service, agent, csrfToken } = await setup('res-malformed');
    const badUuid = await agent
      .post('/reservations')
      .set('x-csrf-token', csrfToken)
      .send({
        salonId: 'not-a-uuid',
        serviceId: service.id,
        startAt: SLOT_START,
        idempotencyKey: randomUUID(),
      });
    expect(badUuid.status).toBe(400);

    const missingIdempotency = await agent
      .post('/reservations')
      .set('x-csrf-token', csrfToken)
      .send({ salonId: salon.id, serviceId: service.id, startAt: SLOT_START });
    expect(missingIdempotency.status).toBe(400);

    const badDate = await agent
      .post('/reservations')
      .set('x-csrf-token', csrfToken)
      .send({
        salonId: salon.id,
        serviceId: service.id,
        startAt: 'not-a-date',
        idempotencyKey: randomUUID(),
      });
    expect(badDate.status).toBe(400);
  });

  it('rejects forbidden fields (mass assignment: customerId, price, status)', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('res-massassign');
    const res = await agent.post('/reservations').set('x-csrf-token', csrfToken).send({
      salonId: salon.id,
      serviceId: service.id,
      employeeId: employee.id,
      startAt: SLOT_START,
      idempotencyKey: randomUUID(),
      customerId: randomUUID(),
      priceAmount: 1,
      status: 'CONFIRMED',
    });
    expect(res.status).toBe(400);
  });

  it('is idempotent: replaying the same idempotencyKey returns the original reservation, not a duplicate', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('res-idempotent');
    const idempotencyKey = randomUUID();
    const body = {
      salonId: salon.id,
      serviceId: service.id,
      employeeId: employee.id,
      startAt: SLOT_START,
      idempotencyKey,
    };

    const first = await agent.post('/reservations').set('x-csrf-token', csrfToken).send(body);
    expect(first.status).toBe(201);

    const second = await agent.post('/reservations').set('x-csrf-token', csrfToken).send(body);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);

    const count = await prisma.reservation.count({ where: { employeeId: employee.id } });
    expect(count).toBe(1);
  });

  it('is idempotent under a real concurrent replay of the same key — never a raw 500, never two reservations', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('res-idempotent-race');
    const idempotencyKey = randomUUID();
    const body = {
      salonId: salon.id,
      serviceId: service.id,
      employeeId: employee.id,
      startAt: SLOT_START,
      idempotencyKey,
    };

    // The pre-transaction idempotency lookup runs before either request's transaction starts, so
    // two truly concurrent replays (identical body — same slot, same key) can both pass it. The
    // loser's insert then violates the DB's unique index on (customerId, idempotencyKey) — and,
    // since a true replay targets the same employee/slot, very likely the overlap EXCLUDE
    // constraint too. Whichever the DB reports, the loser must resolve to a clean 201/409, never
    // an unhandled 500 (the regression this test guards against: a raw P2002 with no matching
    // catch branch used to bubble up as an uncaught 500).
    const [first, second] = await Promise.all([
      agent.post('/reservations').set('x-csrf-token', csrfToken).send(body),
      agent.post('/reservations').set('x-csrf-token', csrfToken).send(body),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses[0]).toBe(201);
    expect([201, 409]).toContain(statuses[1]);

    const count = await prisma.reservation.count({ where: { employeeId: employee.id } });
    expect(count).toBe(1);
  });

  it('prevents double-booking under real concurrent requests — exactly one succeeds', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('res-concurrency');
    const { agent: otherAgent, csrfToken: otherCsrf } = await registerCustomer(
      `res-concurrency-other-${randomUUID()}@example.com`,
    );

    const body = {
      salonId: salon.id,
      serviceId: service.id,
      employeeId: employee.id,
      startAt: SLOT_START,
    };

    const [resA, resB] = await Promise.all([
      agent
        .post('/reservations')
        .set('x-csrf-token', csrfToken)
        .send({ ...body, idempotencyKey: randomUUID() }),
      otherAgent
        .post('/reservations')
        .set('x-csrf-token', otherCsrf)
        .send({ ...body, idempotencyKey: randomUUID() }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const activeCount = await prisma.reservation.count({
      where: { employeeId: employee.id, status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } },
    });
    expect(activeCount).toBe(1);
  });
});
