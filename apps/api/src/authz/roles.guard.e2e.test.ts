import { randomUUID } from 'node:crypto';
import { Controller, Get, INestApplication, Module, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { configureApp } from '../configure-app';
import { validateApiEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentSalonContext, type SalonContext } from './salon-context';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

// A throwaway controller used only to exercise RolesGuard through the real HTTP pipeline (guards +
// param extraction), not a real business feature — Phase 10 explicitly does not build business CRUD.
@Controller('test-authz')
@UseGuards(AuthenticatedGuard, RolesGuard)
class TestAuthzController {
  @Roles('SUPERADMIN')
  @Get('superadmin-only/:salonId')
  superadminOnly(@CurrentSalonContext() ctx: SalonContext) {
    return ctx;
  }

  @Roles('SALON_ADMIN')
  @Get('salon-admin-only/:salonId')
  salonAdminOnly(@CurrentSalonContext() ctx: SalonContext) {
    return ctx;
  }

  @Roles('SALON_ADMIN', 'SALON_MANAGER')
  @Get('salon-staff/:salonId')
  salonStaff(@CurrentSalonContext() ctx: SalonContext) {
    return ctx;
  }

  @Roles('CUSTOMER')
  @Get('customer-only')
  customerOnly() {
    return { ok: true };
  }

  // Deliberately no @Roles() — proves the guard fails closed rather than allowing any authenticated
  // caller through when a route is misconfigured.
  @Get('misconfigured/:salonId')
  misconfigured() {
    return { ok: true };
  }
}

@Module({ controllers: [TestAuthzController] })
class TestAuthzModule {}

let app: INestApplication;
let prisma: PrismaService;

async function registerAndLogin(
  email: string,
): Promise<{ agent: ReturnType<typeof request.agent>; userId: string }> {
  const agent = request.agent(app.getHttpServer());
  const csrfRes = await agent.get('/health');
  const setCookie = csrfRes.headers['set-cookie'];
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const csrfToken = cookies
    .find((c: string) => c.startsWith('csrfToken='))
    ?.split(';')[0]
    ?.split('=')[1];

  const res = await agent
    .post('/auth/register')
    .set('x-csrf-token', csrfToken ?? '')
    .send({ email, password: 'longenoughpassword', fullName: 'Authz Test' });

  return { agent, userId: res.body.id };
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, TestAuthzModule],
  }).compile();
  app = moduleRef.createNestApplication();
  configureApp(app, validateApiEnv(process.env));
  await app.init();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await app.close();
});

describe('RolesGuard denial matrix (docs/security/authorization.md)', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app.getHttpServer()).get(
      `/test-authz/salon-admin-only/${randomUUID()}`,
    );
    expect(res.status).toBe(401);
  });

  it('rejects a route with no @Roles() decorator even for an authenticated user (fail closed)', async () => {
    const { agent } = await registerAndLogin(`authz-misconfig-${randomUUID()}@example.com`);
    const res = await agent.get(`/test-authz/misconfigured/${randomUUID()}`);
    expect(res.status).toBe(404);
  });

  it('rejects a user with no membership for the salon (guessed/changed salon ID)', async () => {
    const { agent } = await registerAndLogin(`authz-nomember-${randomUUID()}@example.com`);
    const res = await agent.get(`/test-authz/salon-admin-only/${randomUUID()}`);
    expect(res.status).toBe(404);
  });

  it('rejects a SALON_MANAGER on a SALON_ADMIN-only route (right salon, wrong role)', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `authz-salon-${randomUUID()}`, name: 'Authz Salon', timezone: 'UTC' },
    });
    const { agent, userId } = await registerAndLogin(`authz-manager-${randomUUID()}@example.com`);
    await prisma.salonMembership.create({
      data: { userId, salonId: salon.id, role: 'SALON_MANAGER' },
    });

    const deniedRes = await agent.get(`/test-authz/salon-admin-only/${salon.id}`);
    expect(deniedRes.status).toBe(404);

    const allowedRes = await agent.get(`/test-authz/salon-staff/${salon.id}`);
    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body).toEqual({
      salonId: salon.id,
      role: 'SALON_MANAGER',
      isSuperadminBypass: false,
    });
  });

  it('rejects a suspended membership even with the correct role', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `authz-salon-${randomUUID()}`, name: 'Authz Salon', timezone: 'UTC' },
    });
    const { agent, userId } = await registerAndLogin(`authz-suspended-${randomUUID()}@example.com`);
    await prisma.salonMembership.create({
      data: { userId, salonId: salon.id, role: 'SALON_ADMIN', status: 'SUSPENDED' },
    });

    const res = await agent.get(`/test-authz/salon-admin-only/${salon.id}`);
    expect(res.status).toBe(404);
  });

  it('rejects an active membership at a suspended salon (Section 11.4 suspend effect)', async () => {
    const salon = await prisma.salon.create({
      data: {
        slug: `authz-suspsalon-${randomUUID()}`,
        name: 'Suspended Salon',
        timezone: 'UTC',
        status: 'SUSPENDED',
      },
    });
    const { agent, userId } = await registerAndLogin(
      `authz-staff-suspsalon-${randomUUID()}@example.com`,
    );
    await prisma.salonMembership.create({
      data: { userId, salonId: salon.id, role: 'SALON_ADMIN' },
    });

    const res = await agent.get(`/test-authz/salon-admin-only/${salon.id}`);
    expect(res.status).toBe(404);
  });

  it('rejects a membership for a *different* salon than the one requested (cross-salon)', async () => {
    const ownSalon = await prisma.salon.create({
      data: { slug: `authz-own-${randomUUID()}`, name: 'Own Salon', timezone: 'UTC' },
    });
    const otherSalon = await prisma.salon.create({
      data: { slug: `authz-other-${randomUUID()}`, name: 'Other Salon', timezone: 'UTC' },
    });
    const { agent, userId } = await registerAndLogin(
      `authz-crosssalon-${randomUUID()}@example.com`,
    );
    await prisma.salonMembership.create({
      data: { userId, salonId: ownSalon.id, role: 'SALON_ADMIN' },
    });

    const res = await agent.get(`/test-authz/salon-admin-only/${otherSalon.id}`);
    expect(res.status).toBe(404);
  });

  it('still allows SUPERADMIN into a suspended salon (needed to restore it)', async () => {
    const salon = await prisma.salon.create({
      data: {
        slug: `authz-suspsuper-${randomUUID()}`,
        name: 'Suspended For Super',
        timezone: 'UTC',
        status: 'SUSPENDED',
      },
    });
    const { agent, userId } = await registerAndLogin(
      `authz-super-suspended-${randomUUID()}@example.com`,
    );
    await prisma.user.update({ where: { id: userId }, data: { isSuperadmin: true } });

    const res = await agent.get(`/test-authz/superadmin-only/${salon.id}`);
    expect(res.status).toBe(200);
  });

  it('allows SUPERADMIN on a route that declares SUPERADMIN, for any salon, and audits it', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `authz-super-${randomUUID()}`, name: 'Super Salon', timezone: 'UTC' },
    });
    const { agent, userId } = await registerAndLogin(
      `authz-superadmin-${randomUUID()}@example.com`,
    );
    await prisma.user.update({ where: { id: userId }, data: { isSuperadmin: true } });

    const res = await agent.get(`/test-authz/superadmin-only/${salon.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ salonId: salon.id, role: 'SUPERADMIN', isSuperadminBypass: true });

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'superadmin.context_entry', salonId: salon.id },
    });
    expect(auditRow).not.toBeNull();
  });

  it('does not let SUPERADMIN bypass a route whose @Roles() does not include SUPERADMIN', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `authz-super2-${randomUUID()}`, name: 'Super Salon 2', timezone: 'UTC' },
    });
    const { agent, userId } = await registerAndLogin(
      `authz-superadmin2-${randomUUID()}@example.com`,
    );
    await prisma.user.update({ where: { id: userId }, data: { isSuperadmin: true } });

    // SUPERADMIN has no SalonMembership row, and salon-admin-only doesn't list SUPERADMIN — denied.
    const res = await agent.get(`/test-authz/salon-admin-only/${salon.id}`);
    expect(res.status).toBe(404);
  });

  it('allows any authenticated user on a CUSTOMER-only route (ownership is the handler’s job, not this guard’s)', async () => {
    const { agent } = await registerAndLogin(`authz-customer-${randomUUID()}@example.com`);
    const res = await agent.get('/test-authz/customer-only');
    expect(res.status).toBe(200);
  });

  it('ignores a forged salonId in the request body — only the route param is authoritative', async () => {
    const salon = await prisma.salon.create({
      data: { slug: `authz-forged-${randomUUID()}`, name: 'Forged Salon', timezone: 'UTC' },
    });
    const otherSalonId = randomUUID();
    const { agent, userId } = await registerAndLogin(`authz-forged-${randomUUID()}@example.com`);
    await prisma.salonMembership.create({
      data: { userId, salonId: salon.id, role: 'SALON_ADMIN' },
    });

    const res = await agent
      .get(`/test-authz/salon-admin-only/${salon.id}`)
      .send({ salonId: otherSalonId });
    expect(res.status).toBe(200);
    expect(res.body.salonId).toBe(salon.id); // not otherSalonId from the body
  });
});
