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

const VALID_SERVICE = {
  name: 'Haircut',
  priceAmount: 5000,
  currency: 'USD',
  durationMinutes: 45,
};

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
    .send({ email, password: 'longenoughpassword', fullName: 'EmpSvc Test' });
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
  const service = await prisma.service.create({ data: { salonId: salon.id, ...VALID_SERVICE } });
  return { salon, agent, csrfToken, userId, employee, service };
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

describe('GET /salons/:salonId/employees/:employeeId/services (list)', () => {
  it('rejects an unauthenticated request', async () => {
    const { salon, employee } = await setup('es-list-unauth');
    const res = await request(app.getHttpServer()).get(
      `/salons/${salon.id}/employees/${employee.id}/services`,
    );
    expect(res.status).toBe(401);
  });

  it('denies SALON_MANAGER and a plain authenticated user (no membership)', async () => {
    const { salon, employee } = await setup('es-list-denied');
    const { agent: managerAgent } = await registerAsSalonManager(
      `es-list-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    expect(
      (await managerAgent.get(`/salons/${salon.id}/employees/${employee.id}/services`)).status,
    ).toBe(404);

    const { agent: plainAgent } = await registerUser(`es-list-plain-${randomUUID()}@example.com`);
    expect(
      (await plainAgent.get(`/salons/${salon.id}/employees/${employee.id}/services`)).status,
    ).toBe(404);
  });

  it('returns assigned services with details', async () => {
    const { salon, agent, csrfToken, employee, service } = await setup('es-list-ok');
    await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ serviceId: service.id });

    const res = await agent.get(`/salons/${salon.id}/employees/${employee.id}/services`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(service.id);
    expect(res.body[0].name).toBe('Haircut');
  });

  it('returns 404 for an employee ID from a different salon', async () => {
    const { salon: salonA, agent, csrfToken } = await setup('es-list-crossA');
    const { employee: employeeB } = await setup('es-list-crossB');
    const res = await agent.get(`/salons/${salonA.id}/employees/${employeeB.id}/services`);
    expect(res.status).toBe(404);
    void csrfToken;
  });
});

describe('POST /salons/:salonId/employees/:employeeId/services (assign)', () => {
  it('rejects SALON_MANAGER', async () => {
    const { salon, employee, service } = await setup('es-assign-denied');
    const { agent, csrfToken } = await registerAsSalonManager(
      `es-assign-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ serviceId: service.id });
    expect(res.status).toBe(404);
  });

  it('assigns a service to an employee, and audits it', async () => {
    const { salon, agent, csrfToken, userId, employee, service } = await setup('es-assign-ok');

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ serviceId: service.id });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(service.id);

    const stored = await prisma.employeeService.findUnique({
      where: { employeeId_serviceId: { employeeId: employee.id, serviceId: service.id } },
    });
    expect(stored).not.toBeNull();

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'employee_service.assigned', targetId: employee.id },
    });
    expect(auditRow).not.toBeNull();
  });

  it('rejects a duplicate assignment', async () => {
    const { salon, agent, csrfToken, employee, service } = await setup('es-assign-dup');
    await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ serviceId: service.id });

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ serviceId: service.id });
    expect(res.status).toBe(409);
  });

  it('rejects assigning an inactive service', async () => {
    const { salon, agent, csrfToken, employee, service } = await setup('es-assign-inactive-svc');
    await agent
      .post(`/salons/${salon.id}/services/${service.id}/deactivate`)
      .set('x-csrf-token', csrfToken);

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ serviceId: service.id });
    expect(res.status).toBe(400);
  });

  it('rejects assigning to an inactive employee', async () => {
    const { salon, agent, csrfToken, employee, service } = await setup('es-assign-inactive-emp');
    await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/deactivate`)
      .set('x-csrf-token', csrfToken);

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ serviceId: service.id });
    expect(res.status).toBe(400);
  });

  it('rejects a serviceId belonging to a different salon (cross-salon IDOR)', async () => {
    const { salon, agent, csrfToken, employee } = await setup('es-assign-crossA');
    const { service: otherService } = await setup('es-assign-crossB');

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ serviceId: otherService.id });
    expect(res.status).toBe(400);
  });

  it('rejects an employeeId belonging to a different salon (cross-salon IDOR)', async () => {
    const { salon: salonA, agent, csrfToken, service } = await setup('es-assign-crossC');
    const { employee: employeeB } = await setup('es-assign-crossD');

    const res = await agent
      .post(`/salons/${salonA.id}/employees/${employeeB.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ serviceId: service.id });
    expect(res.status).toBe(404);
  });

  it('rejects a malformed serviceId', async () => {
    const { salon, agent, csrfToken, employee } = await setup('es-assign-malformed');
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ serviceId: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /salons/:salonId/employees/:employeeId/services/:serviceId (unassign)', () => {
  it('rejects SALON_MANAGER', async () => {
    const { salon, agent, csrfToken, employee, service } = await setup('es-unassign-denied');
    await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ serviceId: service.id });

    const { agent: managerAgent, csrfToken: managerCsrf } = await registerAsSalonManager(
      `es-unassign-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await managerAgent
      .delete(`/salons/${salon.id}/employees/${employee.id}/services/${service.id}`)
      .set('x-csrf-token', managerCsrf);
    expect(res.status).toBe(404);
  });

  it('unassigns a service, and audits it', async () => {
    const { salon, agent, csrfToken, userId, employee, service } = await setup('es-unassign-ok');
    await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ serviceId: service.id });

    const res = await agent
      .delete(`/salons/${salon.id}/employees/${employee.id}/services/${service.id}`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(204);

    const stored = await prisma.employeeService.findUnique({
      where: { employeeId_serviceId: { employeeId: employee.id, serviceId: service.id } },
    });
    expect(stored).toBeNull();

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'employee_service.unassigned', targetId: employee.id },
    });
    expect(auditRow).not.toBeNull();
  });

  it('returns 404 for an assignment that does not exist', async () => {
    const { salon, agent, csrfToken, employee, service } = await setup('es-unassign-missing');
    const res = await agent
      .delete(`/salons/${salon.id}/employees/${employee.id}/services/${service.id}`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(404);
  });

  it('returns 404 for a serviceId belonging to a different salon', async () => {
    const { salon, agent, csrfToken, employee } = await setup('es-unassign-crossA');
    const { service: otherService } = await setup('es-unassign-crossB');

    const res = await agent
      .delete(`/salons/${salon.id}/employees/${employee.id}/services/${otherService.id}`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(404);
  });

  it('returns 404 for an employeeId belonging to a different salon', async () => {
    const { salon: salonA, agent, csrfToken, service } = await setup('es-unassign-crossC');
    const { employee: employeeB } = await setup('es-unassign-crossD');

    const res = await agent
      .delete(`/salons/${salonA.id}/employees/${employeeB.id}/services/${service.id}`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(404);
  });
});
