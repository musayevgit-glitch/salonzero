import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { type Agent } from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { configureApp } from '../configure-app';
import { validateApiEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

// Integration tests against a real Nest app instance + real Postgres (docs/security/authentication.md).
// Focused on attack/failure cases, not just happy paths, per the secure-feature skill.
//
// Every state-changing request needs a real CSRF handshake (a prior GET to receive the csrfToken
// cookie, then the same value echoed as the x-csrf-token header) — CsrfGuard rejects anything else,
// by design. `withCsrf` below does that handshake once per agent and reuses the token.

let app: INestApplication;
let prisma: PrismaService;

function extractCookie(
  setCookieHeader: string | string[] | undefined,
  name: string,
): string | undefined {
  const entries = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];
  const raw = entries.find((entry) => entry.startsWith(`${name}=`));
  return raw?.split(';')[0]?.split('=')[1];
}

async function newAgentWithCsrf(): Promise<{ agent: Agent; csrfToken: string }> {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.get('/health');
  const csrfToken = extractCookie(res.headers['set-cookie'], 'csrfToken');
  if (!csrfToken) throw new Error('csrfToken cookie was not issued');
  return { agent, csrfToken };
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

describe('POST /auth/register', () => {
  it('registers a user and creates an authenticated session', async () => {
    const { agent, csrfToken } = await newAgentWithCsrf();
    const email = `register-${randomUUID()}@example.com`;

    const registerRes = await agent
      .post('/auth/register')
      .set('x-csrf-token', csrfToken)
      .send({ email, password: 'longenoughpassword', fullName: 'Test User' });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.email).toBe(email);
    expect(registerRes.body.passwordHash).toBeUndefined();

    const meRes = await agent.get('/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(email);
  });

  it('rejects a duplicate email with 409', async () => {
    const email = `dup-${randomUUID()}@example.com`;
    const first = await newAgentWithCsrf();
    await first.agent
      .post('/auth/register')
      .set('x-csrf-token', first.csrfToken)
      .send({ email, password: 'longenoughpassword', fullName: 'First' });

    const second = await newAgentWithCsrf();
    const res = await second.agent
      .post('/auth/register')
      .set('x-csrf-token', second.csrfToken)
      .send({ email, password: 'longenoughpassword', fullName: 'Second' });

    expect(res.status).toBe(409);
  });

  it('rejects forbidden-field injection (mass assignment)', async () => {
    const { agent, csrfToken } = await newAgentWithCsrf();
    const res = await agent
      .post('/auth/register')
      .set('x-csrf-token', csrfToken)
      .send({
        email: `injection-${randomUUID()}@example.com`,
        password: 'longenoughpassword',
        fullName: 'Attacker',
        isSuperadmin: true,
      });

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  const email = `login-${randomUUID()}@example.com`;
  const password = 'correcthorsebattery';

  beforeAll(async () => {
    const { agent, csrfToken } = await newAgentWithCsrf();
    await agent
      .post('/auth/register')
      .set('x-csrf-token', csrfToken)
      .send({ email, password, fullName: 'Login Test' });
  });

  it('rejects a wrong password with a generic message', async () => {
    const { agent, csrfToken } = await newAgentWithCsrf();
    const res = await agent
      .post('/auth/login')
      .set('x-csrf-token', csrfToken)
      .send({ email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('rejects a nonexistent email with the exact same generic message (enumeration resistance)', async () => {
    const { agent, csrfToken } = await newAgentWithCsrf();
    const res = await agent
      .post('/auth/login')
      .set('x-csrf-token', csrfToken)
      .send({ email: `nonexistent-${randomUUID()}@example.com`, password: 'whatever123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('logs in successfully and rejects a suspended account the same way', async () => {
    const { agent, csrfToken } = await newAgentWithCsrf();
    const loginRes = await agent
      .post('/auth/login')
      .set('x-csrf-token', csrfToken)
      .send({ email, password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.email).toBe(email);

    // Regression test: AuthGuard('local') authenticates the credentials but does not itself call
    // req.login() — without an explicit req.login() in the controller, /auth/login returns 200 with
    // the user's data yet establishes no session at all, so this would silently pass without this
    // assertion even though the user is never actually logged in.
    const meAfterLoginRes = await agent.get('/auth/me');
    expect(meAfterLoginRes.status).toBe(200);
    expect(meAfterLoginRes.body.email).toBe(email);

    await prisma.user.update({ where: { email }, data: { status: 'SUSPENDED' } });

    // A live session cookie must stop working the moment the account is suspended, not just at
    // next login (docs/security/authentication.md → Suspended users).
    const meRes = await agent.get('/auth/me');
    expect(meRes.status).toBe(401);

    await prisma.user.update({ where: { email }, data: { status: 'ACTIVE' } });
  });
});

describe('CSRF protection', () => {
  it('rejects a state-changing request without a CSRF header', async () => {
    const { agent } = await newAgentWithCsrf();
    const email = `csrf-${randomUUID()}@example.com`;

    // Agent has the csrfToken *cookie* from the priming GET, but the header is deliberately omitted.
    const res = await agent
      .post('/auth/register')
      .send({ email, password: 'longenoughpassword', fullName: 'CSRF Test' });
    expect(res.status).toBe(403);
  });

  it('rejects a request whose header does not match the cookie', async () => {
    const { agent } = await newAgentWithCsrf();
    const res = await agent
      .post('/auth/register')
      .set('x-csrf-token', 'wrong-token-value')
      .send({
        email: `csrf-mismatch-${randomUUID()}@example.com`,
        password: 'longenoughpassword',
        fullName: 'X',
      });
    expect(res.status).toBe(403);
  });

  it('accepts the request once the header matches the cookie', async () => {
    const { agent, csrfToken } = await newAgentWithCsrf();
    const email = `csrf-ok-${randomUUID()}@example.com`;

    const registerRes = await agent
      .post('/auth/register')
      .set('x-csrf-token', csrfToken)
      .send({ email, password: 'longenoughpassword', fullName: 'CSRF OK' });
    expect(registerRes.status).toBe(201);

    const logoutRes = await agent.post('/auth/logout').set('x-csrf-token', csrfToken).send();
    expect(logoutRes.status).toBe(200);
  });
});

describe('POST /auth/forgot-password', () => {
  it('returns the identical response for an existing and a nonexistent email', async () => {
    const existingEmail = `forgot-${randomUUID()}@example.com`;
    const setup = await newAgentWithCsrf();
    await setup.agent
      .post('/auth/register')
      .set('x-csrf-token', setup.csrfToken)
      .send({ email: existingEmail, password: 'longenoughpassword', fullName: 'Forgot Test' });

    const existing = await newAgentWithCsrf();
    const existingRes = await existing.agent
      .post('/auth/forgot-password')
      .set('x-csrf-token', existing.csrfToken)
      .send({ email: existingEmail });

    const nonexistent = await newAgentWithCsrf();
    const nonexistentRes = await nonexistent.agent
      .post('/auth/forgot-password')
      .set('x-csrf-token', nonexistent.csrfToken)
      .send({ email: `nobody-${randomUUID()}@example.com` });

    expect(existingRes.status).toBe(nonexistentRes.status);
    expect(existingRes.body).toEqual(nonexistentRes.body);
  });
});

describe('POST /auth/reset-password', () => {
  it('rejects an invalid/unknown token', async () => {
    const { agent, csrfToken } = await newAgentWithCsrf();
    const res = await agent
      .post('/auth/reset-password')
      .set('x-csrf-token', csrfToken)
      .send({ token: 'not-a-real-token', password: 'newlongenoughpassword' });
    expect(res.status).toBe(401);
  });
});

describe('GET /auth/my-salons', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await request(app.getHttpServer()).get('/auth/my-salons');
    expect(res.status).toBe(401);
  });

  it("returns only the caller's own active memberships in active salons, never another user's", async () => {
    const salon = await prisma.salon.create({
      data: { slug: `my-salons-${randomUUID()}`, name: 'My Salon', timezone: 'UTC' },
    });
    const suspendedSalon = await prisma.salon.create({
      data: {
        slug: `my-salons-suspended-${randomUUID()}`,
        name: 'Suspended Salon',
        timezone: 'UTC',
        status: 'SUSPENDED',
      },
    });

    const { agent, csrfToken } = await newAgentWithCsrf();
    const registerRes = await agent
      .post('/auth/register')
      .set('x-csrf-token', csrfToken)
      .send({ email: `my-salons-${randomUUID()}@example.com`, password: 'longenoughpassword', fullName: 'Member' });
    const userId = registerRes.body.id as string;

    await prisma.salonMembership.create({ data: { userId, salonId: salon.id, role: 'SALON_MANAGER' } });
    await prisma.salonMembership.create({
      data: { userId, salonId: suspendedSalon.id, role: 'SALON_ADMIN' },
    });

    const res = await agent.get('/auth/my-salons');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ salonId: salon.id, salonName: 'My Salon', role: 'SALON_MANAGER' }]);

    const other = await newAgentWithCsrf();
    const otherRegisterRes = await other.agent
      .post('/auth/register')
      .set('x-csrf-token', other.csrfToken)
      .send({ email: `my-salons-other-${randomUUID()}@example.com`, password: 'longenoughpassword', fullName: 'Other' });
    void otherRegisterRes;
    const otherRes = await other.agent.get('/auth/my-salons');
    expect(otherRes.body).toEqual([]);
  });
});
