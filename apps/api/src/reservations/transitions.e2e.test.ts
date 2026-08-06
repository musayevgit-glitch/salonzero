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
    .send({ email, password: 'longenoughpassword', fullName: 'Transition Test' });
  return { agent, userId: res.body.id as string, csrfToken };
}

async function registerAsSalonAdmin(email: string, salonId: string) {
  const { agent, userId, csrfToken } = await registerUser(email);
  await prisma.salonMembership.create({ data: { userId, salonId, role: 'SALON_ADMIN' } });
  return { agent, userId, csrfToken };
}

const SLOT_START = new Date('2026-08-10T10:00:00.000Z'); // Monday

interface SetupOverrides {
  status?: string;
  startAt?: Date;
  endAt?: Date;
  cancellationWindowHours?: number;
  rescheduleWindowHours?: number;
}

async function setup(prefix: string, overrides: SetupOverrides = {}) {
  const salon = await prisma.salon.create({
    data: {
      slug: `${prefix}-${randomUUID()}`,
      name: prefix,
      timezone: 'UTC',
      bookingPolicy: {
        create: {
          cancellationWindowHours: overrides.cancellationWindowHours ?? 24,
          rescheduleWindowHours: overrides.rescheduleWindowHours ?? 24,
        },
      },
    },
  });
  const service = await prisma.service.create({
    data: { salonId: salon.id, name: 'Haircut', priceAmount: 5000, currency: 'USD', durationMinutes: 60 },
  });
  const employee = await prisma.employeeProfile.create({
    data: { salonId: salon.id, fullName: 'Stylist', isActive: true },
  });
  await prisma.employeeService.create({ data: { employeeId: employee.id, serviceId: service.id } });
  await prisma.workingSchedule.create({
    data: { employeeId: employee.id, weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 17 * 60 },
  });

  const { agent: adminAgent, userId: adminId, csrfToken: adminCsrf } = await registerAsSalonAdmin(
    `${prefix}-admin-${randomUUID()}@example.com`,
    salon.id,
  );
  const { agent: custAgent, userId: customerId, csrfToken: custCsrf } = await registerUser(
    `${prefix}-cust-${randomUUID()}@example.com`,
  );

  const startAt = overrides.startAt ?? SLOT_START;
  const endAt = overrides.endAt ?? new Date(startAt.getTime() + 60 * 60_000);
  const reservation = await prisma.reservation.create({
    data: {
      salonId: salon.id,
      serviceId: service.id,
      employeeId: employee.id,
      customerId,
      status: (overrides.status ?? 'PENDING') as never,
      startAt,
      endAt,
      priceAmount: 5000,
      currency: 'USD',
    },
  });

  return {
    salon,
    service,
    employee,
    reservation,
    adminAgent,
    adminId,
    adminCsrf,
    custAgent,
    customerId,
    custCsrf,
  };
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

describe('confirm / reject', () => {
  it('confirms a pending reservation, audits it, and is idempotent', async () => {
    const { salon, reservation, adminAgent, adminId, adminCsrf } = await setup('tr-confirm');
    const res = await adminAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/confirm`)
      .set('x-csrf-token', adminCsrf);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CONFIRMED');

    const audit = await prisma.auditLog.findFirst({
      where: { actorUserId: adminId, action: 'reservation.confirmed', targetId: reservation.id },
    });
    expect(audit).not.toBeNull();

    // idempotent replay
    const again = await adminAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/confirm`)
      .set('x-csrf-token', adminCsrf);
    expect(again.status).toBe(200);
  });

  it('rejects confirming a non-pending reservation', async () => {
    const { salon, reservation, adminAgent, adminCsrf } = await setup('tr-confirm-illegal', {
      status: 'CANCELLED_BY_SALON',
    });
    const res = await adminAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/confirm`)
      .set('x-csrf-token', adminCsrf);
    expect(res.status).toBe(409);
  });

  it('rejects SALON_MANAGER... allows it (in @Roles) but denies CUSTOMER', async () => {
    const { salon, reservation, custAgent, custCsrf } = await setup('tr-confirm-deny-customer');
    const res = await custAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/confirm`)
      .set('x-csrf-token', custCsrf);
    expect(res.status).toBe(404);
  });

  it('rejects a reservation belonging to another salon', async () => {
    const { reservation } = await setup('tr-confirm-crossA');
    const { salon: salonB } = await setup('tr-confirm-crossB');
    const { agent, csrfToken } = await registerAsSalonAdmin(
      `tr-confirm-crossB-admin-${randomUUID()}@example.com`,
      salonB.id,
    );
    const res = await agent
      .post(`/salons/${salonB.id}/reservations/${reservation.id}/confirm`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(404);
  });

  it('rejects and audits with reason, idempotent', async () => {
    const { salon, reservation, adminAgent, adminCsrf } = await setup('tr-reject');
    const res = await adminAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/reject`)
      .set('x-csrf-token', adminCsrf)
      .send({ reason: 'Fully booked' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REJECTED');

    const again = await adminAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/reject`)
      .set('x-csrf-token', adminCsrf);
    expect(again.status).toBe(200);
  });
});

describe('cancellation', () => {
  it('salon can cancel a pending or confirmed reservation any time', async () => {
    const { salon, reservation, adminAgent, adminCsrf } = await setup('tr-salon-cancel');
    const res = await adminAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/cancel`)
      .set('x-csrf-token', adminCsrf)
      .send({ reason: 'Stylist unavailable' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED_BY_SALON');
  });

  it('rejects salon-cancelling an already-terminal reservation', async () => {
    const { salon, reservation, adminAgent, adminCsrf } = await setup('tr-salon-cancel-terminal', {
      status: 'COMPLETED',
    });
    const res = await adminAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/cancel`)
      .set('x-csrf-token', adminCsrf);
    expect(res.status).toBe(409);
  });

  it('customer can cancel within the cancellation window', async () => {
    const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60_000);
    const { reservation, custAgent, custCsrf } = await setup('tr-cust-cancel', {
      startAt: farFuture,
      endAt: new Date(farFuture.getTime() + 60 * 60_000),
    });
    const res = await custAgent
      .post(`/reservations/${reservation.id}/cancel`)
      .set('x-csrf-token', custCsrf);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED_BY_CUSTOMER');
  });

  it('rejects customer cancellation outside the cancellation window', async () => {
    const soon = new Date(Date.now() + 60 * 60_000); // 1 hour away, window is 24h
    const { reservation, custAgent, custCsrf } = await setup('tr-cust-cancel-toolate', {
      startAt: soon,
      endAt: new Date(soon.getTime() + 60 * 60_000),
    });
    const res = await custAgent
      .post(`/reservations/${reservation.id}/cancel`)
      .set('x-csrf-token', custCsrf);
    expect(res.status).toBe(409);
  });

  it('rejects a customer cancelling another customer’s reservation', async () => {
    const { reservation } = await setup('tr-cust-cancel-otherA');
    const { agent: otherAgent, csrfToken: otherCsrf } = await registerUser(
      `tr-cust-cancel-other-${randomUUID()}@example.com`,
    );
    const res = await otherAgent
      .post(`/reservations/${reservation.id}/cancel`)
      .set('x-csrf-token', otherCsrf);
    expect(res.status).toBe(404);
  });
});

describe('reschedule', () => {
  it('staff reschedules with transactional slot release/acquisition', async () => {
    const { salon, reservation, employee, adminAgent, adminCsrf } = await setup('tr-staff-reschedule');
    const newStart = new Date('2026-08-10T14:00:00.000Z');
    const res = await adminAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/reschedule`)
      .set('x-csrf-token', adminCsrf)
      .send({ startAt: newStart.toISOString() });
    expect(res.status).toBe(200);
    expect(res.body.startAt).toBe(newStart.toISOString());
    expect(res.body.employeeId).toBe(employee.id);
  });

  it('rejects rescheduling onto a conflicting slot', async () => {
    const { salon, service, employee, reservation, adminAgent, adminCsrf } = await setup(
      'tr-reschedule-conflict',
    );
    const otherCustomer = await prisma.user.create({
      data: { email: `other-${randomUUID()}@example.com`, passwordHash: 'x', fullName: 'Other' },
    });
    await prisma.reservation.create({
      data: {
        salonId: salon.id,
        serviceId: service.id,
        employeeId: employee.id,
        customerId: otherCustomer.id,
        status: 'CONFIRMED',
        startAt: new Date('2026-08-10T14:00:00.000Z'),
        endAt: new Date('2026-08-10T15:00:00.000Z'),
        priceAmount: 5000,
        currency: 'USD',
      },
    });

    const res = await adminAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/reschedule`)
      .set('x-csrf-token', adminCsrf)
      .send({ startAt: '2026-08-10T14:00:00.000Z' });
    expect(res.status).toBe(409);
  });

  it('customer reschedules within the reschedule window', async () => {
    const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60_000);
    farFuture.setUTCHours(10, 0, 0, 0);
    // Ensure it's a Monday for the working schedule; skip forward if needed.
    while (farFuture.getUTCDay() !== 1) farFuture.setUTCDate(farFuture.getUTCDate() + 1);
    const { reservation, custAgent, custCsrf } = await setup('tr-cust-reschedule', {
      startAt: farFuture,
      endAt: new Date(farFuture.getTime() + 60 * 60_000),
    });
    const newStart = new Date(farFuture.getTime() + 2 * 60 * 60_000);
    const res = await custAgent
      .post(`/reservations/${reservation.id}/reschedule`)
      .set('x-csrf-token', custCsrf)
      .send({ startAt: newStart.toISOString() });
    expect(res.status).toBe(200);
  });

  it('rejects customer reschedule outside the reschedule window', async () => {
    const soon = new Date(Date.now() + 60 * 60_000);
    const { reservation, custAgent, custCsrf } = await setup('tr-cust-reschedule-toolate', {
      startAt: soon,
      endAt: new Date(soon.getTime() + 60 * 60_000),
    });
    const res = await custAgent
      .post(`/reservations/${reservation.id}/reschedule`)
      .set('x-csrf-token', custCsrf)
      .send({ startAt: new Date(soon.getTime() + 3600_000).toISOString() });
    expect(res.status).toBe(409);
  });
});

describe('check-in / completion / no-show', () => {
  it('checks in a confirmed reservation then completes it', async () => {
    const { salon, reservation, adminAgent, adminCsrf } = await setup('tr-checkin', {
      status: 'CONFIRMED',
    });
    const checkin = await adminAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/check-in`)
      .set('x-csrf-token', adminCsrf);
    expect(checkin.status).toBe(200);
    expect(checkin.body.status).toBe('CHECKED_IN');

    const complete = await adminAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/complete`)
      .set('x-csrf-token', adminCsrf);
    expect(complete.status).toBe(200);
    expect(complete.body.status).toBe('COMPLETED');
  });

  it('rejects check-in on a pending (not yet confirmed) reservation', async () => {
    const { salon, reservation, adminAgent, adminCsrf } = await setup('tr-checkin-illegal');
    const res = await adminAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/check-in`)
      .set('x-csrf-token', adminCsrf);
    expect(res.status).toBe(409);
  });

  it('rejects completing a reservation that was never checked in', async () => {
    const { salon, reservation, adminAgent, adminCsrf } = await setup('tr-complete-illegal', {
      status: 'CONFIRMED',
    });
    const res = await adminAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/complete`)
      .set('x-csrf-token', adminCsrf);
    expect(res.status).toBe(409);
  });

  it('marks a past confirmed reservation as no-show', async () => {
    const past = new Date('2020-01-06T10:00:00.000Z'); // a Monday, well in the past
    const { salon, reservation, adminAgent, adminCsrf } = await setup('tr-noshow', {
      status: 'CONFIRMED',
      startAt: past,
      endAt: new Date(past.getTime() + 60 * 60_000),
    });
    const res = await adminAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/no-show`)
      .set('x-csrf-token', adminCsrf);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('NO_SHOW');
  });

  it('rejects marking a future confirmed reservation as no-show', async () => {
    const { salon, reservation, adminAgent, adminCsrf } = await setup('tr-noshow-future', {
      status: 'CONFIRMED',
    });
    const res = await adminAgent
      .post(`/salons/${salon.id}/reservations/${reservation.id}/no-show`)
      .set('x-csrf-token', adminCsrf);
    expect(res.status).toBe(409);
  });
});
