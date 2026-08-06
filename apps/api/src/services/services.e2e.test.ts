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
    .send({ email, password: 'longenoughpassword', fullName: 'Service Test' });
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

describe('GET /salons/:salonId/services (list)', () => {
  it('rejects an unauthenticated request', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `svc-list-unauth-${randomUUID()}`, name: 'Unauth', timezone: 'UTC' },
    });
    const res = await request(app.getHttpServer()).get(`/salons/${salon.id}/services`);
    expect(res.status).toBe(401);
  });

  it('denies SALON_MANAGER and a plain authenticated user (no membership)', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `svc-list-denied-${randomUUID()}`, name: 'Denied', timezone: 'UTC' },
    });
    const { agent: managerAgent } = await registerAsSalonManager(
      `svc-list-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    expect((await managerAgent.get(`/salons/${salon.id}/services`)).status).toBe(404);

    const { agent: plainAgent } = await registerUser(`svc-list-plain-${randomUUID()}@example.com`);
    expect((await plainAgent.get(`/salons/${salon.id}/services`)).status).toBe(404);
  });

  it('never returns another salon’s services (no cross-salon leakage)', async () => {
    const { salon: salonA, agent } = await createSalonAndAdmin('svc-cross-a');
    const salonB = await prisma.salon.create({
      data: { slug: `svc-cross-b-${randomUUID()}`, name: 'B', timezone: 'UTC' },
    });
    await prisma.service.create({ data: { salonId: salonB.id, ...VALID_SERVICE } });

    const res = await agent.get(`/salons/${salonA.id}/services`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('filters by isActive, categoryId, and search', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('svc-filter');
    const category = await prisma.serviceCategory.create({
      data: { salonId: salon.id, name: 'Hair' },
    });
    const inCategory = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ ...VALID_SERVICE, name: 'Balayage', categoryId: category.id });
    const uncategorized = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ ...VALID_SERVICE, name: 'Manicure' });
    await agent
      .post(`/salons/${salon.id}/services/${uncategorized.body.id}/deactivate`)
      .set('x-csrf-token', csrfToken);

    const byCategory = await agent.get(`/salons/${salon.id}/services?categoryId=${category.id}`);
    expect(byCategory.body.items.map((s: { id: string }) => s.id)).toEqual([inCategory.body.id]);

    const activeOnly = await agent.get(`/salons/${salon.id}/services?isActive=true`);
    expect(activeOnly.body.items.map((s: { id: string }) => s.id)).toEqual([inCategory.body.id]);

    const search = await agent.get(`/salons/${salon.id}/services?search=mani`);
    expect(search.body.items.map((s: { id: string }) => s.id)).toEqual([uncategorized.body.id]);
  });
});

describe('POST /salons/:salonId/services (create)', () => {
  it('rejects SALON_MANAGER', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `svc-create-denied-${randomUUID()}`, name: 'Denied', timezone: 'UTC' },
    });
    const { agent, csrfToken } = await registerAsSalonManager(
      `svc-create-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send(VALID_SERVICE);
    expect(res.status).toBe(404);
  });

  it('creates a service scoped to the authorized salon, and audits it', async () => {
    const { salon, agent, csrfToken, userId } = await createSalonAndAdmin('svc-create-ok');

    const res = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send(VALID_SERVICE);

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Haircut');
    expect(res.body.priceAmount).toBe(5000);
    expect(res.body.currency).toBe('USD');
    expect(res.body.bufferMinutes).toBe(0);
    expect(res.body.isActive).toBe(true);

    const stored = await prisma.service.findUnique({ where: { id: res.body.id } });
    expect(stored?.salonId).toBe(salon.id);

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'service.created', targetId: res.body.id },
    });
    expect(auditRow).not.toBeNull();
  });

  it('creates a service with a valid categoryId in the same salon', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('svc-create-category');
    const category = await prisma.serviceCategory.create({
      data: { salonId: salon.id, name: 'Hair' },
    });

    const res = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ ...VALID_SERVICE, categoryId: category.id });
    expect(res.status).toBe(201);
    expect(res.body.categoryId).toBe(category.id);
  });

  it('rejects a categoryId belonging to a different salon', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('svc-create-cross-category');
    const otherSalon = await prisma.salon.create({
      data: { slug: `svc-create-other-cat-${randomUUID()}`, name: 'Other', timezone: 'UTC' },
    });
    const otherCategory = await prisma.serviceCategory.create({
      data: { salonId: otherSalon.id, name: 'Hair' },
    });

    const res = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ ...VALID_SERVICE, categoryId: otherCategory.id });
    expect(res.status).toBe(400);
  });

  it('rejects missing/invalid fields and forbidden fields (mass assignment)', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('svc-create-invalid');

    const missing = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Haircut' });
    expect(missing.status).toBe(400);

    const badDuration = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ ...VALID_SERVICE, durationMinutes: 0 });
    expect(badDuration.status).toBe(400);

    const badBuffer = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ ...VALID_SERVICE, bufferMinutes: -5 });
    expect(badBuffer.status).toBe(400);

    const negativePrice = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ ...VALID_SERVICE, priceAmount: -100 });
    expect(negativePrice.status).toBe(400);

    const forbidden = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ ...VALID_SERVICE, isActive: false, salonId: 'forged' });
    expect(forbidden.status).toBe(400);
  });

  it('cannot be used to create a service in a salon the caller does not administer', async () => {
    const { agent, csrfToken } = await createSalonAndAdmin('svc-create-otherA');
    const salonB = await prisma.salon.create({
      data: { slug: `svc-create-otherB-${randomUUID()}`, name: 'B', timezone: 'UTC' },
    });
    const res = await agent
      .post(`/salons/${salonB.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send(VALID_SERVICE);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /salons/:salonId/services/:serviceId (edit)', () => {
  it('rejects SALON_MANAGER', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('svc-edit-setup');
    const created = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send(VALID_SERVICE);

    const { agent: managerAgent, csrfToken: managerCsrf } = await registerAsSalonManager(
      `svc-edit-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await managerAgent
      .patch(`/salons/${salon.id}/services/${created.body.id}`)
      .set('x-csrf-token', managerCsrf)
      .send({ name: 'Hacked' });
    expect(res.status).toBe(404);
  });

  it('updates only the provided allowlisted fields, and audits which changed', async () => {
    const { salon, agent, csrfToken, userId } = await createSalonAndAdmin('svc-edit-ok');
    const created = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send({ ...VALID_SERVICE, description: 'Original' });

    const res = await agent
      .patch(`/salons/${salon.id}/services/${created.body.id}`)
      .set('x-csrf-token', csrfToken)
      .send({ priceAmount: 6000 });
    expect(res.status).toBe(200);
    expect(res.body.priceAmount).toBe(6000);
    expect(res.body.name).toBe('Haircut');
    expect(res.body.description).toBe('Original');

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'service.updated', targetId: created.body.id },
    });
    expect((auditRow?.metadata as { changedFields: string[] })?.changedFields).toEqual([
      'priceAmount',
    ]);
  });

  it('rejects a stale update (optimistic concurrency)', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('svc-edit-stale');
    const created = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send(VALID_SERVICE);

    const staleTimestamp = new Date(Date.parse(created.body.updatedAt) - 1000).toISOString();
    const res = await agent
      .patch(`/salons/${salon.id}/services/${created.body.id}`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Renamed', expectedUpdatedAt: staleTimestamp });
    expect(res.status).toBe(409);
  });

  it('rejects reassigning to a categoryId from a different salon', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('svc-edit-cross-category');
    const created = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send(VALID_SERVICE);
    const otherSalon = await prisma.salon.create({
      data: { slug: `svc-edit-other-cat-${randomUUID()}`, name: 'Other', timezone: 'UTC' },
    });
    const otherCategory = await prisma.serviceCategory.create({
      data: { salonId: otherSalon.id, name: 'Hair' },
    });

    const res = await agent
      .patch(`/salons/${salon.id}/services/${created.body.id}`)
      .set('x-csrf-token', csrfToken)
      .send({ categoryId: otherCategory.id });
    expect(res.status).toBe(400);
  });

  it('returns 404 for a service ID belonging to a different salon (cross-salon assignment guard)', async () => {
    const { salon: salonA, agent, csrfToken } = await createSalonAndAdmin('svc-edit-crossA');
    const salonB = await prisma.salon.create({
      data: { slug: `svc-edit-crossB-${randomUUID()}`, name: 'B', timezone: 'UTC' },
    });
    const serviceB = await prisma.service.create({
      data: { salonId: salonB.id, ...VALID_SERVICE },
    });

    const res = await agent
      .patch(`/salons/${salonA.id}/services/${serviceB.id}`)
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Hijacked' });
    expect(res.status).toBe(404);

    const stillOriginal = await prisma.service.findUnique({ where: { id: serviceB.id } });
    expect(stillOriginal?.name).toBe(VALID_SERVICE.name);
  });
});

describe('POST .../activate and /deactivate', () => {
  it('rejects SALON_MANAGER for both actions', async () => {
    const { salon, agent, csrfToken } = await createSalonAndAdmin('svc-lifecycle-denied');
    const created = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send(VALID_SERVICE);

    const { agent: managerAgent, csrfToken: managerCsrf } = await registerAsSalonManager(
      `svc-lifecycle-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await managerAgent
      .post(`/salons/${salon.id}/services/${created.body.id}/deactivate`)
      .set('x-csrf-token', managerCsrf);
    expect(res.status).toBe(404);
  });

  it('deactivates then reactivates a service, auditing both', async () => {
    const { salon, agent, csrfToken, userId } = await createSalonAndAdmin('svc-lifecycle-ok');
    const created = await agent
      .post(`/salons/${salon.id}/services`)
      .set('x-csrf-token', csrfToken)
      .send(VALID_SERVICE);

    const deactivateRes = await agent
      .post(`/salons/${salon.id}/services/${created.body.id}/deactivate`)
      .set('x-csrf-token', csrfToken);
    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.body.isActive).toBe(false);

    const activateRes = await agent
      .post(`/salons/${salon.id}/services/${created.body.id}/activate`)
      .set('x-csrf-token', csrfToken);
    expect(activateRes.status).toBe(200);
    expect(activateRes.body.isActive).toBe(true);

    const deactivatedAudit = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'service.deactivated', targetId: created.body.id },
    });
    expect(deactivatedAudit).not.toBeNull();
    const activatedAudit = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'service.activated', targetId: created.body.id },
    });
    expect(activatedAudit).not.toBeNull();
  });

  it('returns 404 for a service ID belonging to a different salon', async () => {
    const { salon: salonA, agent, csrfToken } = await createSalonAndAdmin('svc-lifecycle-crossA');
    const salonB = await prisma.salon.create({
      data: { slug: `svc-lifecycle-crossB-${randomUUID()}`, name: 'B', timezone: 'UTC' },
    });
    const serviceB = await prisma.service.create({
      data: { salonId: salonB.id, ...VALID_SERVICE },
    });

    const res = await agent
      .post(`/salons/${salonA.id}/services/${serviceB.id}/deactivate`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(404);
  });
});
