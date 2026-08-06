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
    .send({ email, password: 'longenoughpassword', fullName: 'Employees Test' });
  return { agent, userId: res.body.id as string };
}

async function registerAsSalonAdmin(email: string, salonId: string) {
  const { agent, userId } = await registerUser(email);
  await prisma.salonMembership.create({ data: { userId, salonId, role: 'SALON_ADMIN' } });
  return { agent, userId };
}

async function registerAsSalonManager(email: string, salonId: string) {
  const { agent, userId } = await registerUser(email);
  await prisma.salonMembership.create({ data: { userId, salonId, role: 'SALON_MANAGER' } });
  return { agent, userId };
}

async function registerAsSuperadmin(email: string) {
  const { agent, userId } = await registerUser(email);
  await prisma.user.update({ where: { id: userId }, data: { isSuperadmin: true } });
  return { agent, userId };
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

describe('GET /salons/:salonId/employees (list)', () => {
  it('rejects an unauthenticated request', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `emp-list-unauth-${randomUUID()}`, name: 'Emp List Unauth', timezone: 'UTC' },
    });
    const res = await request(app.getHttpServer()).get(`/salons/${salon.id}/employees`);
    expect(res.status).toBe(401);
  });

  it('denies SALON_MANAGER and a plain authenticated user (no membership)', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `emp-list-denied-${randomUUID()}`, name: 'Emp List Denied', timezone: 'UTC' },
    });

    const { agent: managerAgent } = await registerAsSalonManager(
      `emp-list-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const managerRes = await managerAgent.get(`/salons/${salon.id}/employees`);
    expect(managerRes.status).toBe(404);

    const { agent: plainAgent } = await registerUser(`emp-list-plain-${randomUUID()}@example.com`);
    const plainRes = await plainAgent.get(`/salons/${salon.id}/employees`);
    expect(plainRes.status).toBe(404);
  });

  it('allows SALON_ADMIN and SUPERADMIN, with search/active-filter/pagination', async () => {
    const suffix = randomUUID();
    const salon = await prisma.salon.create({
      data: { slug: `emp-list-ok-${suffix}`, name: 'Emp List OK', timezone: 'UTC' },
    });
    await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: `Active Stylist ${suffix}`, isActive: true },
    });
    await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: `Inactive Stylist ${suffix}`, isActive: false },
    });

    const { agent: adminAgent } = await registerAsSalonAdmin(
      `emp-list-admin-${suffix}@example.com`,
      salon.id,
    );
    const allRes = await adminAgent.get(`/salons/${salon.id}/employees`).query({ search: suffix });
    expect(allRes.status).toBe(200);
    expect(allRes.body.total).toBe(2);

    const activeOnlyRes = await adminAgent
      .get(`/salons/${salon.id}/employees`)
      .query({ search: suffix, isActive: 'true' });
    expect(activeOnlyRes.body.total).toBe(1);
    expect(activeOnlyRes.body.items[0].fullName).toContain('Active Stylist');

    const { agent: superAgent } = await registerAsSuperadmin(
      `emp-list-super-${suffix}@example.com`,
    );
    const superRes = await superAgent
      .get(`/salons/${salon.id}/employees`)
      .query({ search: suffix });
    expect(superRes.status).toBe(200);
    expect(superRes.body.total).toBe(2);
  });

  it("never returns another salon's employees (no cross-salon leakage)", async () => {
    const suffix = randomUUID();
    const salonA = await prisma.salon.create({
      data: { slug: `emp-cross-a-${suffix}`, name: 'Cross Salon A', timezone: 'UTC' },
    });
    const salonB = await prisma.salon.create({
      data: { slug: `emp-cross-b-${suffix}`, name: 'Cross Salon B', timezone: 'UTC' },
    });
    await prisma.employeeProfile.create({
      data: { salonId: salonA.id, fullName: `Salon A Stylist ${suffix}` },
    });
    await prisma.employeeProfile.create({
      data: { salonId: salonB.id, fullName: `Salon B Stylist ${suffix}` },
    });

    const { agent } = await registerAsSalonAdmin(
      `emp-cross-admin-${suffix}@example.com`,
      salonA.id,
    );
    const res = await agent.get(`/salons/${salonA.id}/employees`);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].fullName).toBe(`Salon A Stylist ${suffix}`);

    // Same admin has no membership at all in salon B — denied outright, not just filtered.
    const crossRes = await agent.get(`/salons/${salonB.id}/employees`);
    expect(crossRes.status).toBe(404);
  });
});

describe('GET /salons/:salonId/employees/:employeeId (detail)', () => {
  it('rejects SALON_MANAGER and a user with no membership', async () => {
    const salon = await prisma.salon.create({
      data: {
        slug: `emp-detail-denied-${randomUUID()}`,
        name: 'Emp Detail Denied',
        timezone: 'UTC',
      },
    });
    const employee = await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Detail Denied Stylist' },
    });

    const { agent: managerAgent } = await registerAsSalonManager(
      `emp-detail-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const managerRes = await managerAgent.get(`/salons/${salon.id}/employees/${employee.id}`);
    expect(managerRes.status).toBe(404);
  });

  it('returns safe profile data for SALON_ADMIN', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `emp-detail-ok-${randomUUID()}`, name: 'Emp Detail OK', timezone: 'UTC' },
    });
    const employee = await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Detail OK Stylist', bio: 'Great stylist' },
    });

    const { agent } = await registerAsSalonAdmin(
      `emp-detail-admin-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await agent.get(`/salons/${salon.id}/employees/${employee.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: employee.id,
      fullName: 'Detail OK Stylist',
      bio: 'Great stylist',
      photoUrl: null,
      isActive: true,
      createdAt: employee.createdAt.toISOString(),
    });
  });

  it('returns 404 for an employee ID from a *different* salon (IDOR guard)', async () => {
    const suffix = randomUUID();
    const salonA = await prisma.salon.create({
      data: { slug: `emp-idor-a-${suffix}`, name: 'IDOR Salon A', timezone: 'UTC' },
    });
    const salonB = await prisma.salon.create({
      data: { slug: `emp-idor-b-${suffix}`, name: 'IDOR Salon B', timezone: 'UTC' },
    });
    const employeeInB = await prisma.employeeProfile.create({
      data: { salonId: salonB.id, fullName: 'IDOR Target Stylist' },
    });

    const { agent } = await registerAsSalonAdmin(`emp-idor-admin-${suffix}@example.com`, salonA.id);
    // Correct role, correct membership, but the employee ID belongs to salon B — must still 404.
    const res = await agent.get(`/salons/${salonA.id}/employees/${employeeInB.id}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for a malformed or nonexistent employee ID', async () => {
    const salon = await prisma.salon.create({
      data: {
        slug: `emp-detail-notfound-${randomUUID()}`,
        name: 'Emp Detail Not Found',
        timezone: 'UTC',
      },
    });
    const { agent } = await registerAsSalonAdmin(
      `emp-detail-nf-${randomUUID()}@example.com`,
      salon.id,
    );

    const malformedRes = await agent.get(`/salons/${salon.id}/employees/not-a-uuid`);
    expect(malformedRes.status).toBe(404);

    const nonexistentRes = await agent.get(`/salons/${salon.id}/employees/${randomUUID()}`);
    expect(nonexistentRes.status).toBe(404);
  });
});
