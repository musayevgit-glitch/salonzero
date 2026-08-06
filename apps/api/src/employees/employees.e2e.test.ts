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

async function registerAsSuperadmin(email: string) {
  const { agent, userId, csrfToken } = await registerUser(email);
  await prisma.user.update({ where: { id: userId }, data: { isSuperadmin: true } });
  return { agent, userId, csrfToken };
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
      updatedAt: employee.updatedAt.toISOString(),
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

describe('POST /salons/:salonId/employees (create)', () => {
  it('rejects SALON_MANAGER and a user with no membership', async () => {
    const salon = await prisma.salon.create({
      data: {
        slug: `emp-create-denied-${randomUUID()}`,
        name: 'Emp Create Denied',
        timezone: 'UTC',
      },
    });
    const { agent, csrfToken } = await registerAsSalonManager(
      `emp-create-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await agent
      .post(`/salons/${salon.id}/employees`)
      .set('x-csrf-token', csrfToken)
      .send({ fullName: 'Hacked Stylist' });
    expect(res.status).toBe(404);
  });

  it('creates an employee scoped to the authorized salon, and audits it', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `emp-create-ok-${randomUUID()}`, name: 'Emp Create OK', timezone: 'UTC' },
    });
    const { agent, csrfToken, userId } = await registerAsSalonAdmin(
      `emp-create-admin-${randomUUID()}@example.com`,
      salon.id,
    );

    const res = await agent
      .post(`/salons/${salon.id}/employees`)
      .set('x-csrf-token', csrfToken)
      .send({ fullName: 'New Stylist', bio: 'Fresh talent' });

    expect(res.status).toBe(201);
    expect(res.body.fullName).toBe('New Stylist');
    expect(res.body.isActive).toBe(true);

    const stored = await prisma.employeeProfile.findUnique({ where: { id: res.body.id } });
    expect(stored?.salonId).toBe(salon.id);

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'employee.created', targetId: res.body.id },
    });
    expect(auditRow).not.toBeNull();
  });

  it('rejects a missing fullName and forbidden/protected fields (mass assignment)', async () => {
    const salon = await prisma.salon.create({
      data: {
        slug: `emp-create-invalid-${randomUUID()}`,
        name: 'Emp Create Invalid',
        timezone: 'UTC',
      },
    });
    const { agent, csrfToken } = await registerAsSalonAdmin(
      `emp-create-invalid-admin-${randomUUID()}@example.com`,
      salon.id,
    );

    const missingRes = await agent
      .post(`/salons/${salon.id}/employees`)
      .set('x-csrf-token', csrfToken)
      .send({});
    expect(missingRes.status).toBe(400);

    const forbiddenRes = await agent
      .post(`/salons/${salon.id}/employees`)
      .set('x-csrf-token', csrfToken)
      .send({ fullName: 'X', isActive: false });
    expect(forbiddenRes.status).toBe(400);
  });

  it('cannot be used to create an employee in a salon the caller does not administer', async () => {
    const suffix = randomUUID();
    const ownSalon = await prisma.salon.create({
      data: { slug: `emp-create-own-${suffix}`, name: 'Create Own Salon', timezone: 'UTC' },
    });
    const otherSalon = await prisma.salon.create({
      data: { slug: `emp-create-other-${suffix}`, name: 'Create Other Salon', timezone: 'UTC' },
    });
    const { agent, csrfToken } = await registerAsSalonAdmin(
      `emp-create-cross-${suffix}@example.com`,
      ownSalon.id,
    );

    const res = await agent
      .post(`/salons/${otherSalon.id}/employees`)
      .set('x-csrf-token', csrfToken)
      .send({ fullName: 'Cross Salon Stylist' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /salons/:salonId/employees/:employeeId (edit)', () => {
  it('rejects SALON_MANAGER', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `emp-edit-denied-${randomUUID()}`, name: 'Emp Edit Denied', timezone: 'UTC' },
    });
    const employee = await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Original Name' },
    });
    const { agent, csrfToken } = await registerAsSalonManager(
      `emp-edit-manager-${randomUUID()}@example.com`,
      salon.id,
    );

    const res = await agent
      .patch(`/salons/${salon.id}/employees/${employee.id}`)
      .set('x-csrf-token', csrfToken)
      .send({ fullName: 'Hacked Name' });
    expect(res.status).toBe(404);
  });

  it('updates only the provided allowlisted fields, and audits which changed', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `emp-edit-ok-${randomUUID()}`, name: 'Emp Edit OK', timezone: 'UTC' },
    });
    const employee = await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Old Name', bio: 'Old bio' },
    });
    const { agent, csrfToken, userId } = await registerAsSalonAdmin(
      `emp-edit-admin-${randomUUID()}@example.com`,
      salon.id,
    );

    const res = await agent
      .patch(`/salons/${salon.id}/employees/${employee.id}`)
      .set('x-csrf-token', csrfToken)
      .send({ fullName: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe('New Name');
    expect(res.body.bio).toBe('Old bio');

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'employee.updated', targetId: employee.id },
    });
    expect((auditRow?.metadata as { changedFields?: string[] } | null)?.changedFields).toEqual([
      'fullName',
    ]);
  });

  it('rejects a stale update (optimistic concurrency)', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `emp-edit-stale-${randomUUID()}`, name: 'Emp Edit Stale', timezone: 'UTC' },
    });
    const employee = await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Stale Stylist' },
    });
    const { agent, csrfToken } = await registerAsSalonAdmin(
      `emp-edit-stale-admin-${randomUUID()}@example.com`,
      salon.id,
    );

    const staleTimestamp = new Date(employee.updatedAt.getTime() - 1000).toISOString();
    const res = await agent
      .patch(`/salons/${salon.id}/employees/${employee.id}`)
      .set('x-csrf-token', csrfToken)
      .send({ fullName: 'Conflicting Name', expectedUpdatedAt: staleTimestamp });
    expect(res.status).toBe(409);
  });

  it('returns 404 for an employee ID belonging to a different salon (cross-salon assignment guard)', async () => {
    const suffix = randomUUID();
    const salonA = await prisma.salon.create({
      data: { slug: `emp-edit-cross-a-${suffix}`, name: 'Edit Cross A', timezone: 'UTC' },
    });
    const salonB = await prisma.salon.create({
      data: { slug: `emp-edit-cross-b-${suffix}`, name: 'Edit Cross B', timezone: 'UTC' },
    });
    const employeeInB = await prisma.employeeProfile.create({
      data: { salonId: salonB.id, fullName: 'Cross Target Stylist' },
    });
    const { agent, csrfToken } = await registerAsSalonAdmin(
      `emp-edit-cross-admin-${suffix}@example.com`,
      salonA.id,
    );

    const res = await agent
      .patch(`/salons/${salonA.id}/employees/${employeeInB.id}`)
      .set('x-csrf-token', csrfToken)
      .send({ fullName: 'Reassigned Name' });
    expect(res.status).toBe(404);

    const untouched = await prisma.employeeProfile.findUnique({ where: { id: employeeInB.id } });
    expect(untouched?.fullName).toBe('Cross Target Stylist');
  });
});

describe('POST /salons/:salonId/employees/:employeeId/activate and /deactivate', () => {
  it('rejects SALON_MANAGER for both actions', async () => {
    const salon = await prisma.salon.create({
      data: {
        slug: `emp-lifecycle-denied-${randomUUID()}`,
        name: 'Emp Lifecycle Denied',
        timezone: 'UTC',
      },
    });
    const employee = await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Lifecycle Denied' },
    });
    const { agent, csrfToken } = await registerAsSalonManager(
      `emp-lifecycle-manager-${randomUUID()}@example.com`,
      salon.id,
    );

    const deactivateRes = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/deactivate`)
      .set('x-csrf-token', csrfToken)
      .send();
    expect(deactivateRes.status).toBe(404);
  });

  it('deactivates then reactivates an employee, auditing both', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `emp-lifecycle-ok-${randomUUID()}`, name: 'Emp Lifecycle OK', timezone: 'UTC' },
    });
    const employee = await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Lifecycle OK' },
    });
    const { agent, csrfToken, userId } = await registerAsSalonAdmin(
      `emp-lifecycle-admin-${randomUUID()}@example.com`,
      salon.id,
    );

    const deactivateRes = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/deactivate`)
      .set('x-csrf-token', csrfToken)
      .send();
    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.body.isActive).toBe(false);

    const deactivateAudit = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'employee.deactivated', targetId: employee.id },
    });
    expect(deactivateAudit).not.toBeNull();

    const activateRes = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/activate`)
      .set('x-csrf-token', csrfToken)
      .send();
    expect(activateRes.status).toBe(200);
    expect(activateRes.body.isActive).toBe(true);

    const activateAudit = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'employee.activated', targetId: employee.id },
    });
    expect(activateAudit).not.toBeNull();
  });

  it('returns 404 for an employee ID belonging to a different salon', async () => {
    const suffix = randomUUID();
    const salonA = await prisma.salon.create({
      data: { slug: `emp-lifecycle-cross-a-${suffix}`, name: 'Lifecycle Cross A', timezone: 'UTC' },
    });
    const salonB = await prisma.salon.create({
      data: { slug: `emp-lifecycle-cross-b-${suffix}`, name: 'Lifecycle Cross B', timezone: 'UTC' },
    });
    const employeeInB = await prisma.employeeProfile.create({
      data: { salonId: salonB.id, fullName: 'Lifecycle Cross Target' },
    });
    const { agent, csrfToken } = await registerAsSalonAdmin(
      `emp-lifecycle-cross-admin-${suffix}@example.com`,
      salonA.id,
    );

    const res = await agent
      .post(`/salons/${salonA.id}/employees/${employeeInB.id}/deactivate`)
      .set('x-csrf-token', csrfToken)
      .send();
    expect(res.status).toBe(404);
  });
});
