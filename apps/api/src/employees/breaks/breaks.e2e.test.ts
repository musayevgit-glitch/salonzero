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
const MON_LUNCH = { weekday: 1, startMinuteOfDay: 720, endMinuteOfDay: 780 }; // 12:00-13:00

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
    .send({ email, password: 'longenoughpassword', fullName: 'Break Test' });
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

async function withMondaySchedule(
  agent: ReturnType<typeof request.agent>,
  csrfToken: string,
  salonId: string,
  employeeId: string,
) {
  await agent
    .post(`/salons/${salonId}/employees/${employeeId}/working-schedule`)
    .set('x-csrf-token', csrfToken)
    .send(MON_9_TO_17);
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

describe('GET .../breaks (list)', () => {
  it('rejects an unauthenticated request', async () => {
    const { salon, employee } = await setup('brk-list-unauth');
    const res = await request(app.getHttpServer()).get(
      `/salons/${salon.id}/employees/${employee.id}/breaks`,
    );
    expect(res.status).toBe(401);
  });

  it('denies SALON_MANAGER and a plain authenticated user (no membership)', async () => {
    const { salon, employee } = await setup('brk-list-denied');
    const { agent: managerAgent } = await registerAsSalonManager(
      `brk-list-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    expect(
      (await managerAgent.get(`/salons/${salon.id}/employees/${employee.id}/breaks`)).status,
    ).toBe(404);

    const { agent: plainAgent } = await registerUser(`brk-list-plain-${randomUUID()}@example.com`);
    expect(
      (await plainAgent.get(`/salons/${salon.id}/employees/${employee.id}/breaks`)).status,
    ).toBe(404);
  });

  it('returns 404 for an employee ID from a different salon', async () => {
    const { salon: salonA, agent } = await setup('brk-list-crossA');
    const { employee: employeeB } = await setup('brk-list-crossB');
    const res = await agent.get(`/salons/${salonA.id}/employees/${employeeB.id}/breaks`);
    expect(res.status).toBe(404);
  });
});

describe('POST .../breaks (create)', () => {
  it('rejects SALON_MANAGER', async () => {
    const { salon, agent, csrfToken, employee } = await setup('brk-create-denied');
    await withMondaySchedule(agent, csrfToken, salon.id, employee.id);
    const { agent: managerAgent, csrfToken: managerCsrf } = await registerAsSalonManager(
      `brk-create-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await managerAgent
      .post(`/salons/${salon.id}/employees/${employee.id}/breaks`)
      .set('x-csrf-token', managerCsrf)
      .send(MON_LUNCH);
    expect(res.status).toBe(404);
  });

  it('creates a break that fits within the working schedule, and audits it', async () => {
    const { salon, agent, csrfToken, userId, employee } = await setup('brk-create-ok');
    await withMondaySchedule(agent, csrfToken, salon.id, employee.id);

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/breaks`)
      .set('x-csrf-token', csrfToken)
      .send(MON_LUNCH);
    expect(res.status).toBe(201);
    expect(res.body.weekday).toBe(1);
    expect(res.body.startMinuteOfDay).toBe(720);

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'break.created', targetId: employee.id },
    });
    expect(auditRow).not.toBeNull();
  });

  it('rejects a break with no working-schedule block that day', async () => {
    const { salon, agent, csrfToken, employee } = await setup('brk-create-noschedule');
    // no working schedule created at all
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/breaks`)
      .set('x-csrf-token', csrfToken)
      .send(MON_LUNCH);
    expect(res.status).toBe(400);
  });

  it('rejects a break extending past the working-schedule block', async () => {
    const { salon, agent, csrfToken, employee } = await setup('brk-create-outside');
    await withMondaySchedule(agent, csrfToken, salon.id, employee.id); // 9:00-17:00
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/breaks`)
      .set('x-csrf-token', csrfToken)
      .send({ weekday: 1, startMinuteOfDay: 1000, endMinuteOfDay: 1100 }); // ends at 18:20, past 17:00
    expect(res.status).toBe(400);
  });

  it('rejects a reversed interval', async () => {
    const { salon, agent, csrfToken, employee } = await setup('brk-create-reversed');
    await withMondaySchedule(agent, csrfToken, salon.id, employee.id);
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/breaks`)
      .set('x-csrf-token', csrfToken)
      .send({ weekday: 1, startMinuteOfDay: 780, endMinuteOfDay: 720 });
    expect(res.status).toBe(400);
  });

  it('rejects an overlapping break on the same weekday', async () => {
    const { salon, agent, csrfToken, employee } = await setup('brk-create-overlap');
    await withMondaySchedule(agent, csrfToken, salon.id, employee.id);
    await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/breaks`)
      .set('x-csrf-token', csrfToken)
      .send(MON_LUNCH); // 12:00-13:00

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/breaks`)
      .set('x-csrf-token', csrfToken)
      .send({ weekday: 1, startMinuteOfDay: 750, endMinuteOfDay: 810 }); // overlaps 12:30-13:30
    expect(res.status).toBe(400);
  });

  it('allows adjacent (touching) breaks on the same weekday', async () => {
    const { salon, agent, csrfToken, employee } = await setup('brk-create-adjacent');
    await withMondaySchedule(agent, csrfToken, salon.id, employee.id);
    await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/breaks`)
      .set('x-csrf-token', csrfToken)
      .send(MON_LUNCH); // 12:00-13:00

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/breaks`)
      .set('x-csrf-token', csrfToken)
      .send({ weekday: 1, startMinuteOfDay: 780, endMinuteOfDay: 810 }); // starts exactly at 13:00
    expect(res.status).toBe(201);
  });

  it('rejects creating a break for an inactive employee', async () => {
    const { salon, agent, csrfToken, employee } = await setup('brk-create-inactive');
    await withMondaySchedule(agent, csrfToken, salon.id, employee.id);
    await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/deactivate`)
      .set('x-csrf-token', csrfToken);

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/breaks`)
      .set('x-csrf-token', csrfToken)
      .send(MON_LUNCH);
    expect(res.status).toBe(400);
  });

  it('cannot be used to create a break for an employee in a salon the caller does not administer', async () => {
    const { agent, csrfToken } = await setup('brk-create-otherA');
    const { salon: salonB, employee: employeeB } = await setup('brk-create-otherB');
    const res = await agent
      .post(`/salons/${salonB.id}/employees/${employeeB.id}/breaks`)
      .set('x-csrf-token', csrfToken)
      .send(MON_LUNCH);
    expect(res.status).toBe(404);
  });
});

describe('DELETE .../breaks/:breakId', () => {
  it('rejects SALON_MANAGER', async () => {
    const { salon, agent, csrfToken, employee } = await setup('brk-delete-denied');
    await withMondaySchedule(agent, csrfToken, salon.id, employee.id);
    const created = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/breaks`)
      .set('x-csrf-token', csrfToken)
      .send(MON_LUNCH);

    const { agent: managerAgent, csrfToken: managerCsrf } = await registerAsSalonManager(
      `brk-delete-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await managerAgent
      .delete(`/salons/${salon.id}/employees/${employee.id}/breaks/${created.body.id}`)
      .set('x-csrf-token', managerCsrf);
    expect(res.status).toBe(404);
  });

  it('deletes a break, and audits it', async () => {
    const { salon, agent, csrfToken, userId, employee } = await setup('brk-delete-ok');
    await withMondaySchedule(agent, csrfToken, salon.id, employee.id);
    const created = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/breaks`)
      .set('x-csrf-token', csrfToken)
      .send(MON_LUNCH);

    const res = await agent
      .delete(`/salons/${salon.id}/employees/${employee.id}/breaks/${created.body.id}`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(204);

    const stored = await prisma.break.findUnique({ where: { id: created.body.id } });
    expect(stored).toBeNull();

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'break.deleted', targetId: employee.id },
    });
    expect(auditRow).not.toBeNull();
  });

  it('returns 404 for a break belonging to a different employee', async () => {
    const { salon, agent, csrfToken, employee } = await setup('brk-delete-crossEmp');
    await withMondaySchedule(agent, csrfToken, salon.id, employee.id);
    const created = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/breaks`)
      .set('x-csrf-token', csrfToken)
      .send(MON_LUNCH);

    const otherEmployee = await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Other' },
    });
    const res = await agent
      .delete(`/salons/${salon.id}/employees/${otherEmployee.id}/breaks/${created.body.id}`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(404);

    const stillThere = await prisma.break.findUnique({ where: { id: created.body.id } });
    expect(stillThere).not.toBeNull();
  });

  it('returns 404 for an employee ID belonging to a different salon', async () => {
    const {
      salon: salonA,
      agent,
      csrfToken,
      employee: employeeA,
    } = await setup('brk-delete-crossA');
    await withMondaySchedule(agent, csrfToken, salonA.id, employeeA.id);
    const created = await agent
      .post(`/salons/${salonA.id}/employees/${employeeA.id}/breaks`)
      .set('x-csrf-token', csrfToken)
      .send(MON_LUNCH);
    const { employee: employeeB } = await setup('brk-delete-crossB');

    const res = await agent
      .delete(`/salons/${salonA.id}/employees/${employeeB.id}/breaks/${created.body.id}`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(404);
  });
});
