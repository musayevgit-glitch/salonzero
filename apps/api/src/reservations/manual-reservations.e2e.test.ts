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
    .send({ email, password: 'longenoughpassword', fullName: 'Manual Test' });
  return { agent, userId: res.body.id as string, csrfToken };
}

async function registerAsSalonAdmin(email: string, salonId: string) {
  const { agent, userId, csrfToken } = await registerUser(email);
  await prisma.salonMembership.create({ data: { userId, salonId, role: 'SALON_ADMIN' } });
  return { agent, userId, csrfToken };
}

async function registerAsSalonManager(email: string, salonId: string) {
  const { agent, userId, csrfToken } = await registerUser(email);
  await prisma.salonMembership.create({
    data: { userId, salonId, role: 'SALON_MANAGER', allowManageReservations: true },
  });
  return { agent, userId, csrfToken };
}

const SLOT_START = '2026-08-10T10:00:00.000Z'; // a Monday

async function setup(prefix: string, options: { bufferMinutes?: number } = {}) {
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
      bufferMinutes: options.bufferMinutes ?? 0,
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
  const { agent, userId, csrfToken } = await registerAsSalonAdmin(
    `${prefix}-admin-${randomUUID()}@example.com`,
    salon.id,
  );
  return { salon, service, employee, agent, adminUserId: userId, csrfToken };
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

describe('POST /salons/:salonId/reservations/manual', () => {
  it('rejects CUSTOMER (denied — not in @Roles)', async () => {
    const { salon, service, employee, csrfToken } = await setup('man-deny-customer');
    const { agent: custAgent, csrfToken: custCsrf } = await registerUser(
      `man-cust-${randomUUID()}@example.com`,
    );
    const res = await custAgent
      .post(`/salons/${salon.id}/reservations/manual`)
      .set('x-csrf-token', custCsrf)
      .send({
        customerEmail: `walkin-${randomUUID()}@example.com`,
        customerFullName: 'Walk In',
        serviceId: service.id,
        employeeId: employee.id,
        startAt: SLOT_START,
      });
    expect(res.status).toBe(404);
    void csrfToken;
  });

  it('allows SALON_MANAGER and creates a new customer + reservation, audited with source MANUAL', async () => {
    const { salon, service, employee } = await setup('man-manager-ok');
    const {
      agent,
      userId: managerId,
      csrfToken,
    } = await registerAsSalonManager(`man-manager-${randomUUID()}@example.com`, salon.id);
    const customerEmail = `walkin-${randomUUID()}@example.com`;
    const res = await agent
      .post(`/salons/${salon.id}/reservations/manual`)
      .set('x-csrf-token', csrfToken)
      .send({
        customerEmail,
        customerFullName: 'Walk In Customer',
        serviceId: service.id,
        employeeId: employee.id,
        startAt: SLOT_START,
      });

    expect(res.status).toBe(201);
    expect(res.body.priceAmount).toBe(5000); // from Service, never the client

    const customer = await prisma.user.findUnique({ where: { email: customerEmail } });
    expect(customer).not.toBeNull();
    const stored = await prisma.reservation.findUnique({ where: { id: res.body.id } });
    expect(stored?.customerId).toBe(customer!.id);

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: managerId, action: 'reservation.created', targetId: res.body.id },
    });
    expect((auditRow?.metadata as { source: string })?.source).toBe('MANUAL');
  });

  it('SEC-016: manual booking replay with the same idempotencyKey creates one reservation', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('man-idempotent');
    const idempotencyKey = randomUUID();
    const customerEmail = `walkin-${randomUUID()}@example.com`;
    const body = {
      customerEmail,
      customerFullName: 'Walk In Customer',
      serviceId: service.id,
      employeeId: employee.id,
      startAt: SLOT_START,
      idempotencyKey,
    };

    const first = await agent
      .post(`/salons/${salon.id}/reservations/manual`)
      .set('x-csrf-token', csrfToken)
      .send(body);
    expect(first.status).toBe(201);

    const second = await agent
      .post(`/salons/${salon.id}/reservations/manual`)
      .set('x-csrf-token', csrfToken)
      .send(body);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);

    const customer = await prisma.user.findUnique({ where: { email: customerEmail } });
    const count = await prisma.reservation.count({ where: { customerId: customer!.id } });
    expect(count).toBe(1);
  });

  it('SEC-016: manual booking replay with changed payload returns 409', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('man-idempotent-mismatch');
    const idempotencyKey = randomUUID();
    const customerEmail = `walkin-${randomUUID()}@example.com`;

    const first = await agent
      .post(`/salons/${salon.id}/reservations/manual`)
      .set('x-csrf-token', csrfToken)
      .send({
        customerEmail,
        customerFullName: 'Walk In Customer',
        serviceId: service.id,
        employeeId: employee.id,
        startAt: '2026-08-10T10:00:00.000Z',
        idempotencyKey,
      });
    expect(first.status).toBe(201);

    const second = await agent
      .post(`/salons/${salon.id}/reservations/manual`)
      .set('x-csrf-token', csrfToken)
      .send({
        customerEmail,
        customerFullName: 'Walk In Customer',
        serviceId: service.id,
        employeeId: employee.id,
        startAt: '2026-08-10T14:00:00.000Z',
        idempotencyKey,
      });
    expect(second.status).toBe(409);
  });

  it('SEC-011: rejects a manual booking inside the previous reservation buffer', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('man-buffer-seq', {
      bufferMinutes: 15,
    });

    const first = await agent
      .post(`/salons/${salon.id}/reservations/manual`)
      .set('x-csrf-token', csrfToken)
      .send({
        customerEmail: `walkin-${randomUUID()}@example.com`,
        customerFullName: 'Walk In',
        serviceId: service.id,
        employeeId: employee.id,
        startAt: '2026-08-10T10:00:00.000Z',
      });
    expect(first.status).toBe(201);

    const second = await agent
      .post(`/salons/${salon.id}/reservations/manual`)
      .set('x-csrf-token', csrfToken)
      .send({
        customerEmail: `walkin-${randomUUID()}@example.com`,
        customerFullName: 'Walk In',
        serviceId: service.id,
        employeeId: employee.id,
        startAt: '2026-08-10T11:00:00.000Z',
      });
    expect(second.status).toBe(409);
  });

  it('SEC-011: serializes concurrent manual bookings that collide only through buffer', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('man-buffer-concurrent', {
      bufferMinutes: 15,
    });

    const requests = [
      agent
        .post(`/salons/${salon.id}/reservations/manual`)
        .set('x-csrf-token', csrfToken)
        .send({
          customerEmail: `walkin-${randomUUID()}@example.com`,
          customerFullName: 'Walk In',
          serviceId: service.id,
          employeeId: employee.id,
          startAt: '2026-08-10T10:00:00.000Z',
        }),
      agent
        .post(`/salons/${salon.id}/reservations/manual`)
        .set('x-csrf-token', csrfToken)
        .send({
          customerEmail: `walkin-${randomUUID()}@example.com`,
          customerFullName: 'Walk In',
          serviceId: service.id,
          employeeId: employee.id,
          startAt: '2026-08-10T11:00:00.000Z',
        }),
    ];

    const statuses = (await Promise.all(requests)).map((res) => res.status).sort();
    expect(statuses).toEqual([201, 409]);
  });

  it('looks up an existing customer by email instead of creating a duplicate', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('man-existing-cust');
    const existing = await prisma.user.create({
      data: {
        email: `existing-${randomUUID()}@example.com`,
        passwordHash: 'x',
        fullName: 'Existing',
      },
    });
    const res = await agent
      .post(`/salons/${salon.id}/reservations/manual`)
      .set('x-csrf-token', csrfToken)
      .send({
        customerEmail: existing.email,
        customerFullName: 'Ignored Name',
        serviceId: service.id,
        employeeId: employee.id,
        startAt: SLOT_START,
      });
    expect(res.status).toBe(201);
    const stored = await prisma.reservation.findUnique({ where: { id: res.body.id } });
    expect(stored?.customerId).toBe(existing.id);
  });

  it('requires customerFullName regardless of whether the account already exists (no existence oracle)', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('man-no-oracle');
    const existing = await prisma.user.create({
      data: {
        email: `existing-${randomUUID()}@example.com`,
        passwordHash: 'x',
        fullName: 'Existing',
      },
    });
    const resExisting = await agent
      .post(`/salons/${salon.id}/reservations/manual`)
      .set('x-csrf-token', csrfToken)
      .send({
        customerEmail: existing.email,
        serviceId: service.id,
        employeeId: employee.id,
        startAt: SLOT_START,
      });
    const resNew = await agent
      .post(`/salons/${salon.id}/reservations/manual`)
      .set('x-csrf-token', csrfToken)
      .send({
        customerEmail: `brandnew-${randomUUID()}@example.com`,
        serviceId: service.id,
        employeeId: employee.id,
        startAt: SLOT_START,
      });
    // Both fail identically (schema-level 400 before the customer lookup ever runs) — the response
    // shape must not reveal whether `existing.email` has an account on this platform.
    expect(resExisting.status).toBe(400);
    expect(resNew.status).toBe(400);
  });

  it('denies manual booking into a suspended salon for its own staff (via RolesGuard)', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('man-suspended-staff');
    await prisma.salon.update({ where: { id: salon.id }, data: { status: 'SUSPENDED' } });
    const res = await agent
      .post(`/salons/${salon.id}/reservations/manual`)
      .set('x-csrf-token', csrfToken)
      .send({
        customerEmail: `walkin-${randomUUID()}@example.com`,
        customerFullName: 'Walk In',
        serviceId: service.id,
        employeeId: employee.id,
        startAt: SLOT_START,
      });
    expect(res.status).toBe(404);
  });

  it('denies manual booking into a suspended salon even for SUPERADMIN (bypasses RolesGuard, so the service itself must check)', async () => {
    const { salon, service, employee } = await setup('man-suspended-super');
    await prisma.salon.update({ where: { id: salon.id }, data: { status: 'SUSPENDED' } });
    const { agent, userId, csrfToken } = await registerUser(
      `man-super-${randomUUID()}@example.com`,
    );
    await prisma.user.update({ where: { id: userId }, data: { isSuperadmin: true } });
    const res = await agent
      .post(`/salons/${salon.id}/reservations/manual`)
      .set('x-csrf-token', csrfToken)
      .send({
        customerEmail: `walkin-${randomUUID()}@example.com`,
        customerFullName: 'Walk In',
        serviceId: service.id,
        employeeId: employee.id,
        startAt: SLOT_START,
      });
    expect(res.status).toBe(404);
  });

  it('cannot be used to book into a salon the caller does not administer (manager cannot choose another salon)', async () => {
    const { agent, csrfToken } = await setup('man-otherA');
    const { salon: salonB, service: serviceB, employee: employeeB } = await setup('man-otherB');
    const res = await agent
      .post(`/salons/${salonB.id}/reservations/manual`)
      .set('x-csrf-token', csrfToken)
      .send({
        customerEmail: `walkin-${randomUUID()}@example.com`,
        customerFullName: 'Walk In',
        serviceId: serviceB.id,
        employeeId: employeeB.id,
        startAt: SLOT_START,
      });
    expect(res.status).toBe(404);
  });

  it('rejects a serviceId not belonging to this salon', async () => {
    const { salon, agent, csrfToken } = await setup('man-badsvcA');
    const { service: otherService } = await setup('man-badsvcB');
    const res = await agent
      .post(`/salons/${salon.id}/reservations/manual`)
      .set('x-csrf-token', csrfToken)
      .send({
        customerEmail: `walkin-${randomUUID()}@example.com`,
        customerFullName: 'Walk In',
        serviceId: otherService.id,
        startAt: SLOT_START,
      });
    expect(res.status).toBe(400);
  });

  it('rejects forbidden fields (price, status, duration, salonId)', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('man-massassign');
    const res = await agent
      .post(`/salons/${salon.id}/reservations/manual`)
      .set('x-csrf-token', csrfToken)
      .send({
        customerEmail: `walkin-${randomUUID()}@example.com`,
        customerFullName: 'Walk In',
        serviceId: service.id,
        employeeId: employee.id,
        startAt: SLOT_START,
        priceAmount: 1,
        status: 'CONFIRMED',
        salonId: randomUUID(),
      });
    expect(res.status).toBe(400);
  });

  it('prevents double-booking under real concurrent manual requests — exactly one succeeds', async () => {
    const { salon, service, employee, agent, csrfToken } = await setup('man-concurrency');
    const { agent: agent2, csrfToken: csrf2 } = await registerAsSalonAdmin(
      `man-concurrency-admin2-${randomUUID()}@example.com`,
      salon.id,
    );
    const body = { serviceId: service.id, employeeId: employee.id, startAt: SLOT_START };

    const [resA, resB] = await Promise.all([
      agent
        .post(`/salons/${salon.id}/reservations/manual`)
        .set('x-csrf-token', csrfToken)
        .send({ ...body, customerEmail: `c1-${randomUUID()}@example.com`, customerFullName: 'C1' }),
      agent2
        .post(`/salons/${salon.id}/reservations/manual`)
        .set('x-csrf-token', csrf2)
        .send({ ...body, customerEmail: `c2-${randomUUID()}@example.com`, customerFullName: 'C2' }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const activeCount = await prisma.reservation.count({
      where: { employeeId: employee.id, status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } },
    });
    expect(activeCount).toBe(1);
  });
});
