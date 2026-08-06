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
    .send({ email, password: 'longenoughpassword', fullName: 'Profile Test' });
  return { agent, userId: res.body.id as string, csrfToken };
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

describe('GET /customer/profile', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await request(app.getHttpServer()).get('/customer/profile');
    expect(res.status).toBe(401);
  });

  it("returns the caller's own profile fields only", async () => {
    const email = `profile-get-${randomUUID()}@example.com`;
    const { agent } = await registerUser(email);
    const res = await agent.get('/customer/profile');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email,
      fullName: 'Profile Test',
      phone: null,
      marketingConsent: false,
    });
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('isSuperadmin');
  });
});

describe('PATCH /customer/profile', () => {
  it('rejects an unauthenticated request', async () => {
    // CsrfGuard runs before AuthenticatedGuard, so an unauthenticated PATCH needs a primed CSRF
    // handshake to actually exercise the 401, not a 403 from the CSRF check firing first.
    const agent = request.agent(app.getHttpServer());
    const csrfRes = await agent.get('/health');
    const csrfToken = extractCsrfToken(csrfRes.headers['set-cookie']);
    const res = await agent
      .patch('/customer/profile')
      .set('x-csrf-token', csrfToken)
      .send({ fullName: 'X' });
    expect(res.status).toBe(401);
  });

  it('updates allowlisted fields and audits the change', async () => {
    const { agent, csrfToken, userId } = await registerUser(
      `profile-update-${randomUUID()}@example.com`,
    );
    const res = await agent
      .patch('/customer/profile')
      .set('x-csrf-token', csrfToken)
      .send({ fullName: 'New Name', phone: '+1 555 0100', marketingConsent: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      fullName: 'New Name',
      phone: '+1 555 0100',
      marketingConsent: true,
    });

    const stored = await prisma.user.findUnique({ where: { id: userId } });
    expect(stored?.fullName).toBe('New Name');

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'customer_profile.updated', targetId: userId },
    });
    expect(auditRow).not.toBeNull();
  });

  it('allows clearing phone with an explicit null', async () => {
    const { agent, csrfToken } = await registerUser(`profile-clear-${randomUUID()}@example.com`);
    await agent
      .patch('/customer/profile')
      .set('x-csrf-token', csrfToken)
      .send({ phone: '+1 555 0100' });
    const res = await agent
      .patch('/customer/profile')
      .set('x-csrf-token', csrfToken)
      .send({ phone: null });
    expect(res.status).toBe(200);
    expect(res.body.phone).toBeNull();
  });

  it('rejects an empty body', async () => {
    const { agent, csrfToken } = await registerUser(`profile-empty-${randomUUID()}@example.com`);
    const res = await agent.patch('/customer/profile').set('x-csrf-token', csrfToken).send({});
    expect(res.status).toBe(400);
  });

  it('rejects forbidden/protected fields (mass assignment)', async () => {
    const { agent, csrfToken } = await registerUser(`profile-mass-${randomUUID()}@example.com`);
    const res = await agent
      .patch('/customer/profile')
      .set('x-csrf-token', csrfToken)
      .send({ email: 'new@example.com', isSuperadmin: true, status: 'SUSPENDED' });
    expect(res.status).toBe(400);
  });

  it("cannot be used to modify another user's profile (identity always from the session)", async () => {
    const first = await registerUser(`profile-victim-${randomUUID()}@example.com`);
    const second = await registerUser(`profile-attacker-${randomUUID()}@example.com`);

    await second.agent
      .patch('/customer/profile')
      .set('x-csrf-token', second.csrfToken)
      .send({ fullName: 'Attacker Changed This' });

    const victim = await prisma.user.findUnique({ where: { id: first.userId } });
    expect(victim?.fullName).toBe('Profile Test');
  });
});
