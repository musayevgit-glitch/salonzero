import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import { configureApp } from '../../configure-app';
import { validateApiEnv } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';

let app: INestApplication;
let prisma: PrismaService;

const RANGE = { startAt: '2026-08-10T09:00:00.000Z', endAt: '2026-08-12T17:00:00.000Z' };

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
    .send({ email, password: 'longenoughpassword', fullName: 'TimeOff Test' });
  return { agent, userId: res.body.id as string, csrfToken };
}

async function registerAsSalonAdmin(email: string, salonId: string) {
  const { agent, userId, csrfToken } = await registerUser(email);
  await prisma.salonMembership.create({ data: { userId, salonId, role: 'SALON_ADMIN' } });
  return { agent, userId, csrfToken };
}

async function registerAsSalonManager(email: string, salonId: string) {
  const { agent, userId, csrfToken } = await registerUser(email);
  await prisma.salonMembership.create({ data: { userId, salonId, role: 'SALON_MANAGER' } });
  return { agent, userId, csrfToken };
}

async function setup(prefix: string) {
  const salon = await prisma.salon.create({
    data: { slug: `${prefix}-${randomUUID()}`, name: prefix, timezone: 'UTC' },
  });
  const { agent, csrfToken, userId } = await registerAsSalonAdmin(
    `${prefix}-admin-${randomUUID()}@example.com`,
    salon.id,
  );
  const employee = await prisma.employeeProfile.create({
    data: { salonId: salon.id, fullName: 'Stylist' },
  });
  return { salon, agent, csrfToken, userId, employee };
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

describe('GET .../time-off (list)', () => {
  it('rejects an unauthenticated request', async () => {
    const { salon, employee } = await setup('to-list-unauth');
    const res = await request(app.getHttpServer()).get(
      `/salons/${salon.id}/employees/${employee.id}/time-off`,
    );
    expect(res.status).toBe(401);
  });

  it('denies SALON_MANAGER and a plain authenticated user (no membership)', async () => {
    const { salon, employee } = await setup('to-list-denied');
    const { agent: managerAgent } = await registerAsSalonManager(
      `to-list-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    expect(
      (await managerAgent.get(`/salons/${salon.id}/employees/${employee.id}/time-off`)).status,
    ).toBe(404);

    const { agent: plainAgent } = await registerUser(`to-list-plain-${randomUUID()}@example.com`);
    expect(
      (await plainAgent.get(`/salons/${salon.id}/employees/${employee.id}/time-off`)).status,
    ).toBe(404);
  });

  it('returns 404 for an employee ID from a different salon', async () => {
    const { salon: salonA, agent } = await setup('to-list-crossA');
    const { employee: employeeB } = await setup('to-list-crossB');
    const res = await agent.get(`/salons/${salonA.id}/employees/${employeeB.id}/time-off`);
    expect(res.status).toBe(404);
  });
});

describe('POST .../time-off (create)', () => {
  it('rejects SALON_MANAGER', async () => {
    const { salon, employee } = await setup('to-create-denied');
    const { agent, csrfToken } = await registerAsSalonManager(
      `to-create-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/time-off`)
      .set('x-csrf-token', csrfToken)
      .send(RANGE);
    expect(res.status).toBe(404);
  });

  it('creates a time-off period with no conflicts, and audits it', async () => {
    const { salon, agent, csrfToken, userId, employee } = await setup('to-create-ok');
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/time-off`)
      .set('x-csrf-token', csrfToken)
      .send({ ...RANGE, reason: 'Vacation' });
    expect(res.status).toBe(201);
    expect(res.body.reason).toBe('Vacation');

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'time_off.created', targetId: employee.id },
    });
    expect(auditRow).not.toBeNull();
  });

  it('rejects endAt before startAt', async () => {
    const { salon, agent, csrfToken, employee } = await setup('to-create-reversed');
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/time-off`)
      .set('x-csrf-token', csrfToken)
      .send({ startAt: RANGE.endAt, endAt: RANGE.startAt });
    expect(res.status).toBe(400);
  });

  it('rejects a reason over the length cap', async () => {
    const { salon, agent, csrfToken, employee } = await setup('to-create-longreason');
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/time-off`)
      .set('x-csrf-token', csrfToken)
      .send({ ...RANGE, reason: 'x'.repeat(501) });
    expect(res.status).toBe(400);
  });

  it('rejects an overlapping time-off period for the same employee', async () => {
    const { salon, agent, csrfToken, employee } = await setup('to-create-overlap');
    await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/time-off`)
      .set('x-csrf-token', csrfToken)
      .send(RANGE);

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/time-off`)
      .set('x-csrf-token', csrfToken)
      .send({ startAt: '2026-08-11T00:00:00.000Z', endAt: '2026-08-13T00:00:00.000Z' });
    expect(res.status).toBe(409);
  });

  it('surfaces conflicting reservations instead of silently creating the time-off, then allows an explicit override', async () => {
    const { salon, agent, csrfToken, employee } = await setup('to-create-reservation-conflict');
    const service = await prisma.service.create({
      data: {
        salonId: salon.id,
        name: 'Haircut',
        priceAmount: 5000,
        currency: 'USD',
        durationMinutes: 60,
      },
    });
    const customer = await prisma.user.create({
      data: { email: `customer-${randomUUID()}@example.com`, passwordHash: 'x', fullName: 'Cust' },
    });
    const reservation = await prisma.reservation.create({
      data: {
        salonId: salon.id,
        serviceId: service.id,
        employeeId: employee.id,
        customerId: customer.id,
        status: 'CONFIRMED',
        startAt: new Date('2026-08-11T10:00:00.000Z'),
        endAt: new Date('2026-08-11T11:00:00.000Z'),
        priceAmount: 5000,
        currency: 'USD',
      },
    });

    const firstAttempt = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/time-off`)
      .set('x-csrf-token', csrfToken)
      .send(RANGE);
    expect(firstAttempt.status).toBe(409);
    expect(firstAttempt.body.conflicts).toHaveLength(1);
    expect(firstAttempt.body.conflicts[0].id).toBe(reservation.id);

    const noTimeOffYet = await prisma.timeOff.findFirst({ where: { employeeId: employee.id } });
    expect(noTimeOffYet).toBeNull();
    const reservationUntouched = await prisma.reservation.findUnique({
      where: { id: reservation.id },
    });
    expect(reservationUntouched?.status).toBe('CONFIRMED'); // never silently cancelled

    const secondAttempt = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/time-off`)
      .set('x-csrf-token', csrfToken)
      .send({ ...RANGE, acknowledgeConflicts: true });
    expect(secondAttempt.status).toBe(201);

    const stillUntouched = await prisma.reservation.findUnique({ where: { id: reservation.id } });
    expect(stillUntouched?.status).toBe('CONFIRMED'); // still never touched, even after override
  });

  it('does not treat terminal-status reservations (cancelled) as conflicts', async () => {
    const { salon, agent, csrfToken, employee } = await setup('to-create-terminal');
    const service = await prisma.service.create({
      data: {
        salonId: salon.id,
        name: 'Haircut',
        priceAmount: 5000,
        currency: 'USD',
        durationMinutes: 60,
      },
    });
    const customer = await prisma.user.create({
      data: { email: `customer-${randomUUID()}@example.com`, passwordHash: 'x', fullName: 'Cust' },
    });
    await prisma.reservation.create({
      data: {
        salonId: salon.id,
        serviceId: service.id,
        employeeId: employee.id,
        customerId: customer.id,
        status: 'CANCELLED_BY_CUSTOMER',
        startAt: new Date('2026-08-11T10:00:00.000Z'),
        endAt: new Date('2026-08-11T11:00:00.000Z'),
        priceAmount: 5000,
        currency: 'USD',
      },
    });

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/time-off`)
      .set('x-csrf-token', csrfToken)
      .send(RANGE);
    expect(res.status).toBe(201);
  });

  it('cannot be used to create time off for an employee in a salon the caller does not administer', async () => {
    const { agent, csrfToken } = await setup('to-create-otherA');
    const { salon: salonB, employee: employeeB } = await setup('to-create-otherB');
    const res = await agent
      .post(`/salons/${salonB.id}/employees/${employeeB.id}/time-off`)
      .set('x-csrf-token', csrfToken)
      .send(RANGE);
    expect(res.status).toBe(404);
  });
});

describe('DELETE .../time-off/:timeOffId', () => {
  it('rejects SALON_MANAGER', async () => {
    const { salon, agent, csrfToken, employee } = await setup('to-delete-denied');
    const created = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/time-off`)
      .set('x-csrf-token', csrfToken)
      .send(RANGE);

    const { agent: managerAgent, csrfToken: managerCsrf } = await registerAsSalonManager(
      `to-delete-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await managerAgent
      .delete(`/salons/${salon.id}/employees/${employee.id}/time-off/${created.body.id}`)
      .set('x-csrf-token', managerCsrf);
    expect(res.status).toBe(404);
  });

  it('deletes a time-off period, and audits it', async () => {
    const { salon, agent, csrfToken, userId, employee } = await setup('to-delete-ok');
    const created = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/time-off`)
      .set('x-csrf-token', csrfToken)
      .send(RANGE);

    const res = await agent
      .delete(`/salons/${salon.id}/employees/${employee.id}/time-off/${created.body.id}`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(204);

    const stored = await prisma.timeOff.findUnique({ where: { id: created.body.id } });
    expect(stored).toBeNull();

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'time_off.deleted', targetId: employee.id },
    });
    expect(auditRow).not.toBeNull();
  });

  it('returns 404 for a time-off period belonging to a different employee', async () => {
    const { salon, agent, csrfToken, employee } = await setup('to-delete-crossEmp');
    const created = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/time-off`)
      .set('x-csrf-token', csrfToken)
      .send(RANGE);

    const otherEmployee = await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Other' },
    });
    const res = await agent
      .delete(`/salons/${salon.id}/employees/${otherEmployee.id}/time-off/${created.body.id}`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(404);

    const stillThere = await prisma.timeOff.findUnique({ where: { id: created.body.id } });
    expect(stillThere).not.toBeNull();
  });

  it('returns 404 for an employee ID belonging to a different salon', async () => {
    const {
      salon: salonA,
      agent,
      csrfToken,
      employee: employeeA,
    } = await setup('to-delete-crossA');
    const created = await agent
      .post(`/salons/${salonA.id}/employees/${employeeA.id}/time-off`)
      .set('x-csrf-token', csrfToken)
      .send(RANGE);
    const { employee: employeeB } = await setup('to-delete-crossB');

    const res = await agent
      .delete(`/salons/${salonA.id}/employees/${employeeB.id}/time-off/${created.body.id}`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(404);
  });
});
