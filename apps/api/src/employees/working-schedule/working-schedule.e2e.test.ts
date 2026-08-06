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

const MON_9_TO_17 = { weekday: 1, startMinuteOfDay: 540, endMinuteOfDay: 1020 };

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
    .send({ email, password: 'longenoughpassword', fullName: 'Schedule Test' });
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

describe('GET .../working-schedule (list)', () => {
  it('rejects an unauthenticated request', async () => {
    const { salon, employee } = await setup('ws-list-unauth');
    const res = await request(app.getHttpServer()).get(
      `/salons/${salon.id}/employees/${employee.id}/working-schedule`,
    );
    expect(res.status).toBe(401);
  });

  it('denies SALON_MANAGER and a plain authenticated user (no membership)', async () => {
    const { salon, employee } = await setup('ws-list-denied');
    const { agent: managerAgent } = await registerAsSalonManager(
      `ws-list-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    expect(
      (await managerAgent.get(`/salons/${salon.id}/employees/${employee.id}/working-schedule`))
        .status,
    ).toBe(404);

    const { agent: plainAgent } = await registerUser(`ws-list-plain-${randomUUID()}@example.com`);
    expect(
      (await plainAgent.get(`/salons/${salon.id}/employees/${employee.id}/working-schedule`))
        .status,
    ).toBe(404);
  });

  it('returns 404 for an employee ID from a different salon', async () => {
    const { salon: salonA, agent } = await setup('ws-list-crossA');
    const { employee: employeeB } = await setup('ws-list-crossB');
    const res = await agent.get(`/salons/${salonA.id}/employees/${employeeB.id}/working-schedule`);
    expect(res.status).toBe(404);
  });
});

describe('POST .../working-schedule (create)', () => {
  it('rejects SALON_MANAGER', async () => {
    const { salon, employee } = await setup('ws-create-denied');
    const { agent, csrfToken } = await registerAsSalonManager(
      `ws-create-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send(MON_9_TO_17);
    expect(res.status).toBe(404);
  });

  it('creates a schedule entry, and audits it', async () => {
    const { salon, agent, csrfToken, userId, employee } = await setup('ws-create-ok');
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send(MON_9_TO_17);
    expect(res.status).toBe(201);
    expect(res.body.weekday).toBe(1);
    expect(res.body.startMinuteOfDay).toBe(540);
    expect(res.body.endMinuteOfDay).toBe(1020);

    const auditRow = await prisma.auditLog.findFirst({
      where: {
        actorUserId: userId,
        action: 'working_schedule.created',
        targetId: employee.id,
      },
    });
    expect(auditRow).not.toBeNull();
  });

  it('rejects a reversed interval', async () => {
    const { salon, agent, csrfToken, employee } = await setup('ws-create-reversed');
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send({ weekday: 1, startMinuteOfDay: 1020, endMinuteOfDay: 540 });
    expect(res.status).toBe(400);
  });

  it('rejects an out-of-range weekday and minute values', async () => {
    const { salon, agent, csrfToken, employee } = await setup('ws-create-oob');
    const badWeekday = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send({ ...MON_9_TO_17, weekday: 9 });
    expect(badWeekday.status).toBe(400);

    const badMinute = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send({ ...MON_9_TO_17, endMinuteOfDay: 5000 });
    expect(badMinute.status).toBe(400);
  });

  it('rejects an overlapping interval on the same weekday', async () => {
    const { salon, agent, csrfToken, employee } = await setup('ws-create-overlap');
    await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send(MON_9_TO_17);

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send({ weekday: 1, startMinuteOfDay: 960, endMinuteOfDay: 1080 }); // overlaps 540-1020
    expect(res.status).toBe(400);
  });

  it('allows adjacent (touching, non-overlapping) intervals on the same weekday', async () => {
    const { salon, agent, csrfToken, employee } = await setup('ws-create-adjacent');
    await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send(MON_9_TO_17);

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send({ weekday: 1, startMinuteOfDay: 1020, endMinuteOfDay: 1200 }); // starts exactly at 1020
    expect(res.status).toBe(201);
  });

  it('allows the same interval on a different weekday', async () => {
    const { salon, agent, csrfToken, employee } = await setup('ws-create-diffday');
    await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send(MON_9_TO_17);

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send({ ...MON_9_TO_17, weekday: 2 });
    expect(res.status).toBe(201);
  });

  it('rejects creating a schedule for an inactive employee', async () => {
    const { salon, agent, csrfToken, employee } = await setup('ws-create-inactive');
    await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/deactivate`)
      .set('x-csrf-token', csrfToken);

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send(MON_9_TO_17);
    expect(res.status).toBe(400);
  });

  it('cannot be used to create a schedule for an employee in a salon the caller does not administer', async () => {
    const { agent, csrfToken } = await setup('ws-create-otherA');
    const { salon: salonB, employee: employeeB } = await setup('ws-create-otherB');
    const res = await agent
      .post(`/salons/${salonB.id}/employees/${employeeB.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send(MON_9_TO_17);
    expect(res.status).toBe(404);
  });
});

describe('DELETE .../working-schedule/:scheduleId', () => {
  it('rejects SALON_MANAGER', async () => {
    const { salon, agent, csrfToken, employee } = await setup('ws-delete-denied');
    const created = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send(MON_9_TO_17);

    const { agent: managerAgent, csrfToken: managerCsrf } = await registerAsSalonManager(
      `ws-delete-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await managerAgent
      .delete(`/salons/${salon.id}/employees/${employee.id}/working-schedule/${created.body.id}`)
      .set('x-csrf-token', managerCsrf);
    expect(res.status).toBe(404);
  });

  it('deletes a schedule entry, and audits it', async () => {
    const { salon, agent, csrfToken, userId, employee } = await setup('ws-delete-ok');
    const created = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send(MON_9_TO_17);

    const res = await agent
      .delete(`/salons/${salon.id}/employees/${employee.id}/working-schedule/${created.body.id}`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(204);

    const stored = await prisma.workingSchedule.findUnique({ where: { id: created.body.id } });
    expect(stored).toBeNull();

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'working_schedule.deleted', targetId: employee.id },
    });
    expect(auditRow).not.toBeNull();
  });

  it('returns 404 for a schedule entry belonging to a different employee', async () => {
    const { salon, agent, csrfToken, employee } = await setup('ws-delete-crossEmp');
    const created = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send(MON_9_TO_17);

    const otherEmployee = await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Other' },
    });
    const res = await agent
      .delete(
        `/salons/${salon.id}/employees/${otherEmployee.id}/working-schedule/${created.body.id}`,
      )
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(404);

    const stillThere = await prisma.workingSchedule.findUnique({ where: { id: created.body.id } });
    expect(stillThere).not.toBeNull();
  });

  it('returns 404 for an employee ID belonging to a different salon', async () => {
    const {
      salon: salonA,
      agent,
      csrfToken,
      employee: employeeA,
    } = await setup('ws-delete-crossA');
    const created = await agent
      .post(`/salons/${salonA.id}/employees/${employeeA.id}/working-schedule`)
      .set('x-csrf-token', csrfToken)
      .send(MON_9_TO_17);
    const { employee: employeeB } = await setup('ws-delete-crossB');

    const res = await agent
      .delete(`/salons/${salonA.id}/employees/${employeeB.id}/working-schedule/${created.body.id}`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(404);
  });
});
