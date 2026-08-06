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

const RANGE = { from: '2020-01-01', to: '2099-12-31' };

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
  if (!token) throw new Error('csrfToken not found');
  return token;
}

async function registerUser(email: string) {
  const agent = request.agent(app.getHttpServer());
  const csrfRes = await agent.get('/health');
  const csrfToken = extractCsrfToken(csrfRes.headers['set-cookie']);
  const res = await agent
    .post('/auth/register')
    .set('x-csrf-token', csrfToken)
    .send({ email, password: 'longenoughpassword', fullName: 'Test' });
  return { agent, csrfToken, userId: res.body.id as string };
}

async function makeSuperadmin(agent: ReturnType<typeof request.agent>, userId: string, csrfToken: string) {
  await prisma.user.update({ where: { id: userId }, data: { isSuperadmin: true } });
  // Re-login to refresh the session
  const loginRes = await agent
    .post('/auth/login')
    .set('x-csrf-token', csrfToken)
    .send({ email: (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))!.email, password: 'longenoughpassword' });
  return loginRes;
}

async function createSalonWithAdmin() {
  const salon = await prisma.salon.create({
    data: {
      slug: `report-salon-${randomUUID()}`,
      name: 'Report Salon',
      timezone: 'UTC',
      bookingPolicy: { create: { autoConfirm: true, minNoticeMinutes: 0, maxAdvanceDays: 9999 } },
    },
  });
  const { agent, csrfToken, userId } = await registerUser(`rep-admin-${randomUUID()}@example.com`);
  await prisma.salonMembership.create({ data: { salonId: salon.id, userId, role: 'SALON_ADMIN' } });
  return { salon, agent, csrfToken, userId };
}

beforeAll(async () => {
  const env = validateApiEnv(process.env);
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  configureApp(app, env);
  await app.init();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await app.close();
});

describe('GET /salons/:salonId/reports', () => {
  it('requires authentication', async () => {
    const agent = request.agent(app.getHttpServer());
    const salon = await prisma.salon.create({
      data: { slug: `rep-unauth-${randomUUID()}`, name: 'R', timezone: 'UTC', bookingPolicy: { create: { autoConfirm: true, minNoticeMinutes: 0, maxAdvanceDays: 60 } } },
    });
    const res = await agent.get(`/salons/${salon.id}/reports?from=${RANGE.from}&to=${RANGE.to}`);
    expect(res.status).toBe(401);
  });

  it('returns report data for SALON_ADMIN', async () => {
    const { salon, agent } = await createSalonWithAdmin();
    const res = await agent.get(`/salons/${salon.id}/reports?from=${RANGE.from}&to=${RANGE.to}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      total: expect.any(Number),
      byStatus: expect.any(Object),
      revenue: expect.any(Object),
      byDay: expect.any(Object),
      topServices: expect.any(Array),
    });
  });

  it('rejects a SALON_ADMIN from another salon', async () => {
    const { salon } = await createSalonWithAdmin();
    const { agent: otherAgent } = await createSalonWithAdmin();
    const res = await otherAgent.get(`/salons/${salon.id}/reports?from=${RANGE.from}&to=${RANGE.to}`);
    expect([403, 404]).toContain(res.status);
  });

  it('rejects unauthenticated customer role', async () => {
    const { salon } = await createSalonWithAdmin();
    const { agent: customer } = await registerUser(`rep-cust-${randomUUID()}@example.com`);
    const res = await customer.get(`/salons/${salon.id}/reports?from=${RANGE.from}&to=${RANGE.to}`);
    expect([403, 404]).toContain(res.status);
  });

  it('rejects invalid date range (from > to)', async () => {
    const { salon, agent } = await createSalonWithAdmin();
    const res = await agent.get(`/salons/${salon.id}/reports?from=2099-01-01&to=2020-01-01`);
    expect(res.status).toBe(400);
  });

  it('rejects unknown query params', async () => {
    const { salon, agent } = await createSalonWithAdmin();
    const res = await agent.get(`/salons/${salon.id}/reports?from=${RANGE.from}&to=${RANGE.to}&evil=true`);
    expect(res.status).toBe(400);
  });
});

describe('GET /salons/:salonId/reports/audit-logs', () => {
  it('returns audit logs for SALON_ADMIN', async () => {
    const { salon, agent } = await createSalonWithAdmin();
    const res = await agent.get(`/salons/${salon.id}/reports/audit-logs`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      items: expect.any(Array),
      total: expect.any(Number),
    });
    // Actor emails must not expose passwordHash
    for (const item of res.body.items) {
      if (item.actor) {
        expect(item.actor).not.toHaveProperty('passwordHash');
      }
    }
  });

  it('does not leak other salons audit events', async () => {
    const { salon: salonA } = await createSalonWithAdmin();
    const { salon: salonB, agent: agentB } = await createSalonWithAdmin();
    // Write an audit event scoped to salonA
    await prisma.auditLog.create({
      data: { action: 'test.cross_tenant', targetType: 'Test', targetId: randomUUID(), salonId: salonA.id },
    });
    const res = await agentB.get(`/salons/${salonB.id}/reports/audit-logs?action=test.cross_tenant`);
    expect(res.status).toBe(200);
    // salonB admin must not see salonA events
    expect(res.body.items.every((i: { salonId: string }) => i.salonId === salonB.id)).toBe(true);
  });

  it('SEC-020: redacts sensitive metadata keys when reading audit logs', async () => {
    const { salon, agent } = await createSalonWithAdmin();
    await prisma.auditLog.create({
      data: {
        action: 'test.metadata_redaction',
        targetType: 'Test',
        targetId: randomUUID(),
        salonId: salon.id,
        metadata: { safe: 'ok', resetToken: 'secret-token' },
      },
    });

    const res = await agent.get(
      `/salons/${salon.id}/reports/audit-logs?action=test.metadata_redaction`,
    );
    expect(res.status).toBe(200);
    expect(res.body.items[0].metadata).toEqual({ safe: 'ok', resetToken: '[REDACTED]' });
  });
});

describe('GET /superadmin/reports', () => {
  it('requires authentication', async () => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent.get(`/superadmin/reports?from=${RANGE.from}&to=${RANGE.to}`);
    expect(res.status).toBe(401);
  });

  it('rejects a regular SALON_ADMIN', async () => {
    const { agent } = await createSalonWithAdmin();
    const res = await agent.get(`/superadmin/reports?from=${RANGE.from}&to=${RANGE.to}`);
    expect([403, 404]).toContain(res.status);
  });

  it('returns global report for SUPERADMIN', async () => {
    const { agent, userId, csrfToken } = await registerUser(`sa-rep-${randomUUID()}@example.com`);
    await makeSuperadmin(agent, userId, csrfToken);
    const res = await agent.get(`/superadmin/reports?from=${RANGE.from}&to=${RANGE.to}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      total: expect.any(Number),
      byStatus: expect.any(Object),
      bySalon: expect.any(Array),
    });
  });
});

describe('GET /superadmin/reports/audit-logs', () => {
  it('rejects non-SUPERADMIN', async () => {
    const { agent } = await createSalonWithAdmin();
    const res = await agent.get('/superadmin/reports/audit-logs');
    expect([403, 404]).toContain(res.status);
  });

  it('returns all audit logs for SUPERADMIN (no salonId filter)', async () => {
    const { agent, userId, csrfToken } = await registerUser(`sa-audit-${randomUUID()}@example.com`);
    await makeSuperadmin(agent, userId, csrfToken);
    const res = await agent.get('/superadmin/reports/audit-logs');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: expect.any(Array), total: expect.any(Number) });
    // Actor rows must never expose passwordHash
    for (const item of res.body.items) {
      if (item.actor) {
        expect(item.actor).not.toHaveProperty('passwordHash');
      }
    }
  });
});
