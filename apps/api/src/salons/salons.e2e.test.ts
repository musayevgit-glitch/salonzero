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

async function registerAsSuperadmin(email: string) {
  const agent = request.agent(app.getHttpServer());
  const csrfRes = await agent.get('/health');
  const csrfToken = extractCsrfToken(csrfRes.headers['set-cookie']);
  const res = await agent
    .post('/auth/register')
    .set('x-csrf-token', csrfToken)
    .send({ email, password: 'longenoughpassword', fullName: 'Superadmin Test' });
  await prisma.user.update({ where: { id: res.body.id }, data: { isSuperadmin: true } });
  return { agent, csrfToken, userId: res.body.id as string };
}

async function registerRegularUser(email: string) {
  const agent = request.agent(app.getHttpServer());
  const csrfRes = await agent.get('/health');
  const csrfToken = extractCsrfToken(csrfRes.headers['set-cookie']);
  await agent
    .post('/auth/register')
    .set('x-csrf-token', csrfToken)
    .send({ email, password: 'longenoughpassword', fullName: 'Regular User' });
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

describe('GET /salons (superadmin list)', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await request(app.getHttpServer()).get('/salons');
    expect(res.status).toBe(401);
  });

  it('rejects a non-superadmin authenticated user', async () => {
    const { agent } = await registerRegularUser(`salons-list-regular-${randomUUID()}@example.com`);
    const res = await agent.get('/salons');
    expect(res.status).toBe(404);
  });

  it('lists salons with pagination, search, and status filter, and audits the access', async () => {
    const suffix = randomUUID();
    const salonA = await prisma.salon.create({
      data: { slug: `list-a-${suffix}`, name: `Alpha Salon ${suffix}`, timezone: 'UTC' },
    });
    const salonB = await prisma.salon.create({
      data: {
        slug: `list-b-${suffix}`,
        name: `Beta Salon ${suffix}`,
        timezone: 'UTC',
        status: 'SUSPENDED',
      },
    });

    const superadminEmail = `salons-list-super-${suffix}@example.com`;
    const { agent } = await registerAsSuperadmin(superadminEmail);

    const allRes = await agent.get('/salons').query({ search: suffix, pageSize: 10 });
    expect(allRes.status).toBe(200);
    expect(allRes.body.total).toBe(2);
    expect(allRes.body.items.map((i: { id: string }) => i.id).sort()).toEqual(
      [salonA.id, salonB.id].sort(),
    );

    const activeOnlyRes = await agent.get('/salons').query({ search: suffix, status: 'ACTIVE' });
    expect(activeOnlyRes.body.total).toBe(1);
    expect(activeOnlyRes.body.items[0].id).toBe(salonA.id);

    const superadmin = await prisma.user.findUnique({ where: { email: superadminEmail } });
    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: superadmin!.id, action: 'superadmin.platform_action' },
    });
    expect(auditRow).not.toBeNull();
  });

  it('rejects unknown query parameters and invalid pageSize', async () => {
    const { agent } = await registerAsSuperadmin(
      `salons-list-badquery-${randomUUID()}@example.com`,
    );

    const unknownParamRes = await agent.get('/salons').query({ sort: 'name' });
    expect(unknownParamRes.status).toBe(400);

    const badPageSizeRes = await agent.get('/salons').query({ pageSize: 1000 });
    expect(badPageSizeRes.status).toBe(400);
  });
});

describe('GET /salons/:salonId (superadmin detail)', () => {
  it('rejects a non-superadmin authenticated user with 404', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `detail-regular-${randomUUID()}`, name: 'Detail Salon', timezone: 'UTC' },
    });
    const { agent } = await registerRegularUser(
      `salons-detail-regular-${randomUUID()}@example.com`,
    );
    const res = await agent.get(`/salons/${salon.id}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for a malformed ID and for a well-formed but nonexistent ID (no existence leakage)', async () => {
    const { agent } = await registerAsSuperadmin(
      `salons-detail-notfound-${randomUUID()}@example.com`,
    );

    const malformedRes = await agent.get('/salons/not-a-uuid');
    expect(malformedRes.status).toBe(404);

    const nonexistentRes = await agent.get(`/salons/${randomUUID()}`);
    expect(nonexistentRes.status).toBe(404);
  });

  it('returns the salon detail with active membership count, and audits the access', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `detail-ok-${randomUUID()}`, name: 'Detail OK Salon', timezone: 'UTC' },
    });
    const staffUser = await prisma.user.create({
      data: { email: `staff-${randomUUID()}@example.com`, passwordHash: 'x', fullName: 'Staff' },
    });
    await prisma.salonMembership.create({
      data: { userId: staffUser.id, salonId: salon.id, role: 'SALON_ADMIN' },
    });

    const superadminEmail = `salons-detail-ok-${randomUUID()}@example.com`;
    const { agent } = await registerAsSuperadmin(superadminEmail);
    const res = await agent.get(`/salons/${salon.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(salon.id);
    expect(res.body.activeMembershipCount).toBe(1);

    const superadmin = await prisma.user.findUnique({ where: { email: superadminEmail } });
    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: superadmin!.id, action: 'superadmin.context_entry', salonId: salon.id },
    });
    expect(auditRow).not.toBeNull();
  });
});

describe('POST /salons (superadmin create)', () => {
  it('rejects an unauthenticated request', async () => {
    // Prime CSRF first so this actually exercises AuthenticatedGuard (401), not CsrfGuard (403) —
    // the global CsrfGuard runs before controller-level guards, so a bare unauthenticated POST with
    // no CSRF handshake at all would 403 first regardless of auth state.
    const agent = request.agent(app.getHttpServer());
    const csrfRes = await agent.get('/health');
    const csrfToken = extractCsrfToken(csrfRes.headers['set-cookie']);
    const res = await agent
      .post('/salons')
      .set('x-csrf-token', csrfToken)
      .send({ name: 'X', timezone: 'UTC', adminEmail: 'a@example.com' });
    expect(res.status).toBe(401);
  });

  it('rejects a non-superadmin authenticated user', async () => {
    const { agent, csrfToken } = await registerRegularUser(
      `salons-create-regular-${randomUUID()}@example.com`,
    );
    const res = await agent
      .post('/salons')
      .set('x-csrf-token', csrfToken)
      .send({ name: 'X', timezone: 'UTC', adminEmail: 'a@example.com' });
    expect(res.status).toBe(404);
  });

  it('creates a salon with a default booking policy, an invitation, and an audit event', async () => {
    const suffix = randomUUID();
    const { agent, csrfToken, userId } = await registerAsSuperadmin(
      `salons-create-super-${suffix}@example.com`,
    );
    const adminEmail = `new-admin-${suffix}@example.com`;

    const res = await agent
      .post('/salons')
      .set('x-csrf-token', csrfToken)
      .send({ name: `Created Salon ${suffix}`, timezone: 'Asia/Baku', adminEmail });

    expect(res.status).toBe(201);
    expect(res.body.salon.slug).toBe(`created-salon-${suffix}`);
    expect(res.body.invitation.email).toBe(adminEmail);
    expect(typeof res.body.invitation.token).toBe('string');

    const bookingPolicy = await prisma.bookingPolicy.findUnique({
      where: { salonId: res.body.salon.id },
    });
    expect(bookingPolicy).not.toBeNull();

    const invitation = await prisma.salonInvitation.findFirst({
      where: { salonId: res.body.salon.id },
    });
    expect(invitation?.email).toBe(adminEmail);
    expect(invitation?.role).toBe('SALON_ADMIN');
    expect(invitation?.invitedByUserId).toBe(userId);

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'salon.created', targetId: res.body.salon.id },
    });
    expect(auditRow).not.toBeNull();
  });

  it('derives the slug from the name when no slug is provided, normalizes a provided one', async () => {
    const suffix = randomUUID();
    const { agent, csrfToken } = await registerAsSuperadmin(
      `salons-create-slug-${suffix}@example.com`,
    );

    const withSlug = await agent
      .post('/salons')
      .set('x-csrf-token', csrfToken)
      .send({
        name: `Slug Test ${suffix}`,
        slug: `Custom-Slug-${suffix}`,
        timezone: 'UTC',
        adminEmail: `admin-${suffix}@example.com`,
      });
    expect(withSlug.status).toBe(201);
    expect(withSlug.body.salon.slug).toBe(`custom-slug-${suffix}`);
  });

  it('rejects a duplicate slug with 409 (duplicate-submission protection)', async () => {
    const suffix = randomUUID();
    const { agent, csrfToken } = await registerAsSuperadmin(
      `salons-create-dup-${suffix}@example.com`,
    );
    const payload = {
      name: `Dup Salon ${suffix}`,
      timezone: 'UTC',
      adminEmail: `admin-${suffix}@example.com`,
    };

    const first = await agent.post('/salons').set('x-csrf-token', csrfToken).send(payload);
    expect(first.status).toBe(201);

    const second = await agent.post('/salons').set('x-csrf-token', csrfToken).send(payload);
    expect(second.status).toBe(409);
  });

  it('rejects an invalid IANA timezone', async () => {
    const { agent, csrfToken } = await registerAsSuperadmin(
      `salons-create-tz-${randomUUID()}@example.com`,
    );
    const res = await agent
      .post('/salons')
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Bad TZ Salon', timezone: 'Not/AZone', adminEmail: 'a@example.com' });
    expect(res.status).toBe(400);
  });

  it('rejects a missing required field', async () => {
    const { agent, csrfToken } = await registerAsSuperadmin(
      `salons-create-missing-${randomUUID()}@example.com`,
    );
    const res = await agent
      .post('/salons')
      .set('x-csrf-token', csrfToken)
      .send({ timezone: 'UTC', adminEmail: 'a@example.com' });
    expect(res.status).toBe(400);
  });

  it('rejects forbidden/protected field injection (mass assignment)', async () => {
    const { agent, csrfToken } = await registerAsSuperadmin(
      `salons-create-injection-${randomUUID()}@example.com`,
    );
    const res = await agent.post('/salons').set('x-csrf-token', csrfToken).send({
      name: 'Injected Salon',
      timezone: 'UTC',
      adminEmail: 'a@example.com',
      status: 'SUSPENDED',
      id: 'forged-id',
    });
    expect(res.status).toBe(400);
  });
});
