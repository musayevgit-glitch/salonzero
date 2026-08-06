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
    .send({ email, password: 'longenoughpassword', fullName: 'Category Test' });
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

async function createSalonAndAdmin(prefix: string) {
  const salon = await prisma.salon.create({
    data: { slug: `${prefix}-${randomUUID()}`, name: prefix, timezone: 'UTC' },
  });
  const { agent, csrfToken, userId } = await registerAsSalonAdmin(
    `${prefix}-admin-${randomUUID()}@example.com`,
    salon.id,
  );
  return { salon, agent, csrfToken, userId };
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

describe('GET /salons/:salonId/service-categories (list)', () => {
  it('rejects an unauthenticated request', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `sc-list-unauth-${randomUUID()}`, name: 'Unauth', timezone: 'UTC' },
    });
    const res = await request(app.getHttpServer()).get(`/salons/${salon.id}/service-categories`);
    expect(res.status).toBe(401);
  });

  it('denies SALON_MANAGER and a plain authenticated user (no membership)', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `sc-list-denied-${randomUUID()}`, name: 'Denied', timezone: 'UTC' },
    });
    const { agent: managerAgent } = await registerAsSalonManager(
      `sc-list-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const managerRes = await managerAgent.get(`/salons/${salon.id}/service-categories`);
    expect(managerRes.status).toBe(404);

    const { agent: plainAgent } = await registerUser(`sc-list-plain-${randomUUID()}@example.com`);
    const plainRes = await plainAgent.get(`/salons/${salon.id}/service-categories`);
    expect(plainRes.status).toBe(404);
  });

  it('never returns another salon’s categories (no cross-salon leakage)', async () => {
    const { salon: salonA, agent } = await createSalonAndAdmin('sc-cross-a');
    const salonB = await prisma.salon.create({
      data: { slug: `sc-cross-b-${randomUUID()}`, name: 'B', timezone: 'UTC' },
    });
    await prisma.serviceCategory.create({ data: { salonId: salonB.id, name: 'Hair' } });

    const res = await agent.get(`/salons/${salonA.id}/service-categories`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /salons/:salonId/service-categories (create)', () => {
  it('rejects SALON_MANAGER', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `sc-create-denied-${randomUUID()}`, name: 'Denied', timezone: 'UTC' },
    });
    const { agent, csrfToken } = await registerAsSalonManager(
      `sc-create-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hacked Category' });
    expect(res.status).toBe(404);
  });

  it('creates a category scoped to the authorized salon, and audits it', async () => {
    const { salon, agent, csrfToken, userId } = await createSalonAndAdmin('sc-create-ok');

    const res = await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Hair');
    expect(res.body.isActive).toBe(true);
    expect(res.body.sortOrder).toBe(0);

    const stored = await prisma.serviceCategory.findUnique({ where: { id: res.body.id } });
    expect(stored?.salonId).toBe(salon.id);

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'service_category.created', targetId: res.body.id },
    });
    expect(auditRow).not.toBeNull();
  });

  it('rejects a missing name and forbidden/protected fields (mass assignment)', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('sc-create-invalid');

    const missingName = await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({});
    expect(missingName.status).toBe(400);

    const forbidden = await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair', isActive: false, salonId: 'forged' });
    expect(forbidden.status).toBe(400);
  });

  it('rejects a duplicate name within the same salon (uniqueness)', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('sc-create-dup');
    await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair' });

    const res = await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair' });
    expect(res.status).toBe(409);
  });

  it('allows the same name across two different salons', async () => {
    const {
      salon: salonA,
      agent: agentA,
      csrfToken: csrfA,
    } = await createSalonAndAdmin('sc-dup-a');
    const {
      salon: salonB,
      agent: agentB,
      csrfToken: csrfB,
    } = await createSalonAndAdmin('sc-dup-b');

    const resA = await agentA
      .post(`/salons/${salonA.id}/service-categories`)
      .set('x-csrf-token', csrfA)
      .send({ name: 'Hair' });
    expect(resA.status).toBe(201);

    const resB = await agentB
      .post(`/salons/${salonB.id}/service-categories`)
      .set('x-csrf-token', csrfB)
      .send({ name: 'Hair' });
    expect(resB.status).toBe(201);
  });

  it('cannot be used to create a category in a salon the caller does not administer', async () => {
    const { agent, csrfToken } = await createSalonAndAdmin('sc-create-otherA');
    const salonB = await prisma.salon.create({
      data: { slug: `sc-create-otherB-${randomUUID()}`, name: 'B', timezone: 'UTC' },
    });
    const res = await agent
      .post(`/salons/${salonB.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /salons/:salonId/service-categories/:categoryId (edit)', () => {
  it('rejects SALON_MANAGER', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('sc-edit-setup');
    const created = await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair' });

    const { agent: managerAgent, csrfToken: managerCsrf } = await registerAsSalonManager(
      `sc-edit-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await managerAgent
      .patch(`/salons/${salon.id}/service-categories/${created.body.id}`)
      .set('x-csrf-token', managerCsrf)
      .send({ name: 'Hacked' });
    expect(res.status).toBe(404);
  });

  it('updates the name and audits it', async () => {
    const { salon, agent, csrfToken, userId } = await createSalonAndAdmin('sc-edit-ok');
    const created = await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair' });

    const res = await agent
      .patch(`/salons/${salon.id}/service-categories/${created.body.id}`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair & Beauty' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Hair & Beauty');

    const auditRow = await prisma.auditLog.findFirst({
      where: {
        actorUserId: userId,
        action: 'service_category.updated',
        targetId: created.body.id,
      },
    });
    expect(auditRow).not.toBeNull();
  });

  it('rejects a rename to a name already used by another category in the same salon', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('sc-edit-dup');
    await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair' });
    const nails = await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Nails' });

    const res = await agent
      .patch(`/salons/${salon.id}/service-categories/${nails.body.id}`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair' });
    expect(res.status).toBe(409);
  });

  it('rejects a stale update (optimistic concurrency)', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('sc-edit-stale');
    const created = await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair' });

    const staleTimestamp = new Date(Date.parse(created.body.updatedAt) - 1000).toISOString();
    const res = await agent
      .patch(`/salons/${salon.id}/service-categories/${created.body.id}`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Renamed', expectedUpdatedAt: staleTimestamp });
    expect(res.status).toBe(409);
  });

  it('returns 404 for a category ID belonging to a different salon (cross-salon assignment guard)', async () => {
    const { salon: salonA, agent, csrfToken } = await createSalonAndAdmin('sc-edit-crossA');
    const salonB = await prisma.salon.create({
      data: { slug: `sc-edit-crossB-${randomUUID()}`, name: 'B', timezone: 'UTC' },
    });
    const categoryB = await prisma.serviceCategory.create({
      data: { salonId: salonB.id, name: 'Hair' },
    });

    const res = await agent
      .patch(`/salons/${salonA.id}/service-categories/${categoryB.id}`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hijacked' });
    expect(res.status).toBe(404);

    const stillOriginal = await prisma.serviceCategory.findUnique({ where: { id: categoryB.id } });
    expect(stillOriginal?.name).toBe('Hair');
  });
});

describe('POST .../activate and /deactivate', () => {
  it('rejects SALON_MANAGER for both actions', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('sc-lifecycle-denied');
    const created = await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair' });

    const { agent: managerAgent, csrfToken: managerCsrf } = await registerAsSalonManager(
      `sc-lifecycle-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const deactivateRes = await managerAgent
      .post(`/salons/${salon.id}/service-categories/${created.body.id}/deactivate`)
      .set('x-csrf-token', managerCsrf);
    expect(deactivateRes.status).toBe(404);
  });

  it('deactivates then reactivates a category, auditing both', async () => {
    const { salon, agent, csrfToken, userId } = await createSalonAndAdmin('sc-lifecycle-ok');
    const created = await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair' });

    const deactivateRes = await agent
      .post(`/salons/${salon.id}/service-categories/${created.body.id}/deactivate`)
      .set('x-csrf-token', csrfToken);
    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.body.isActive).toBe(false);

    const activateRes = await agent
      .post(`/salons/${salon.id}/service-categories/${created.body.id}/activate`)
      .set('x-csrf-token', csrfToken);
    expect(activateRes.status).toBe(200);
    expect(activateRes.body.isActive).toBe(true);

    const deactivatedAudit = await prisma.auditLog.findFirst({
      where: {
        actorUserId: userId,
        action: 'service_category.deactivated',
        targetId: created.body.id,
      },
    });
    expect(deactivatedAudit).not.toBeNull();
    const activatedAudit = await prisma.auditLog.findFirst({
      where: {
        actorUserId: userId,
        action: 'service_category.activated',
        targetId: created.body.id,
      },
    });
    expect(activatedAudit).not.toBeNull();
  });

  it('returns 404 for a category ID belonging to a different salon', async () => {
    const { salon: salonA, agent, csrfToken } = await createSalonAndAdmin('sc-lifecycle-crossA');
    const salonB = await prisma.salon.create({
      data: { slug: `sc-lifecycle-crossB-${randomUUID()}`, name: 'B', timezone: 'UTC' },
    });
    const categoryB = await prisma.serviceCategory.create({
      data: { salonId: salonB.id, name: 'Hair' },
    });

    const res = await agent
      .post(`/salons/${salonA.id}/service-categories/${categoryB.id}/deactivate`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(404);
  });
});

describe('POST .../service-categories/reorder', () => {
  it('reorders categories and audits it', async () => {
    const { salon, agent, csrfToken, userId } = await createSalonAndAdmin('sc-reorder-ok');
    const first = await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair' });
    const second = await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Nails' });
    expect(first.body.sortOrder).toBe(0);
    expect(second.body.sortOrder).toBe(1);

    const res = await agent
      .post(`/salons/${salon.id}/service-categories/reorder`)
      .set('x-csrf-token', csrfToken)
      .send({ categoryIds: [second.body.id, first.body.id] });
    expect(res.status).toBe(200);

    const listRes = await agent.get(`/salons/${salon.id}/service-categories`);
    expect(listRes.body.map((c: { id: string }) => c.id)).toEqual([second.body.id, first.body.id]);

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'service_category.reordered' },
    });
    expect(auditRow).not.toBeNull();
  });

  it('rejects a reorder payload that omits an existing category', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('sc-reorder-invalid');
    const first = await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair' });
    await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Nails' });

    const res = await agent
      .post(`/salons/${salon.id}/service-categories/reorder`)
      .set('x-csrf-token', csrfToken)
      .send({ categoryIds: [first.body.id] });
    expect(res.status).toBe(400);
  });

  it('rejects SALON_MANAGER', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('sc-reorder-denied');
    const created = await agent
      .post(`/salons/${salon.id}/service-categories`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hair' });

    const { agent: managerAgent, csrfToken: managerCsrf } = await registerAsSalonManager(
      `sc-reorder-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await managerAgent
      .post(`/salons/${salon.id}/service-categories/reorder`)
      .set('x-csrf-token', managerCsrf)
      .send({ categoryIds: [created.body.id] });
    expect(res.status).toBe(404);
  });
});
