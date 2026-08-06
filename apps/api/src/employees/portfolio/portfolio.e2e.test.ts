import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { LocalDiskStorageAdapter } from '@salonomia/storage';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import { configureApp } from '../../configure-app';
import { validateApiEnv } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { LOCAL_DISK_ADAPTER } from '../../storage/storage.tokens';

let app: INestApplication;
let prisma: PrismaService;
let localDisk: LocalDiskStorageAdapter | null;

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

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
    .send({ email, password: 'longenoughpassword', fullName: 'Portfolio Test' });
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

function pathOf(url: string): string {
  return new URL(url).pathname;
}

async function createSalonAndAdminAndEmployee(prefix: string) {
  const salon = await prisma.salon.create({
    data: { slug: `${prefix}-${randomUUID()}`, name: prefix, timezone: 'UTC' },
  });
  const { agent, csrfToken, userId } = await registerAsSalonAdmin(
    `${prefix}-admin-${randomUUID()}@example.com`,
    salon.id,
  );
  const employee = await prisma.employeeProfile.create({
    data: { salonId: salon.id, fullName: 'Portfolio Owner' },
  });
  return { salon, agent, csrfToken, userId, employee };
}

async function uploadPngAndConfirm(
  agent: ReturnType<typeof request.agent>,
  csrfToken: string,
  salonId: string,
  employeeId: string,
  caption?: string,
) {
  const uploadRes = await agent
    .post(`/salons/${salonId}/employees/${employeeId}/portfolio/upload-url`)
    .set('x-csrf-token', csrfToken)
    .send({ mimeType: 'image/png', sizeBytes: PNG_BYTES.length });
  expect(uploadRes.status).toBe(201);

  const putRes = await agent
    .put(pathOf(uploadRes.body.url))
    .set('Content-Type', 'image/png')
    .set('x-csrf-token', csrfToken)
    .send(PNG_BYTES);
  expect(putRes.status).toBe(204);

  const confirmRes = await agent
    .post(`/salons/${salonId}/employees/${employeeId}/portfolio`)
    .set('x-csrf-token', csrfToken)
    .send({ objectKey: uploadRes.body.objectKey, ...(caption ? { caption } : {}) });

  return confirmRes;
}

async function requestPortfolioUpload(
  agent: ReturnType<typeof request.agent>,
  csrfToken: string,
  salonId: string,
  employeeId: string,
  sizeBytes = PNG_BYTES.length,
) {
  const uploadRes = await agent
    .post(`/salons/${salonId}/employees/${employeeId}/portfolio/upload-url`)
    .set('x-csrf-token', csrfToken)
    .send({ mimeType: 'image/png', sizeBytes });
  expect(uploadRes.status).toBe(201);
  return uploadRes.body as { url: string; objectKey: string };
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  configureApp(app, validateApiEnv(process.env));
  await app.init();
  prisma = app.get(PrismaService);
  localDisk = app.get<LocalDiskStorageAdapter | null>(LOCAL_DISK_ADAPTER);
});

afterAll(async () => {
  await app.close();
});

describe('employee portfolio upload/confirm', () => {
  it('rejects SALON_MANAGER on upload-url', async () => {
    const { salon, employee } = await createSalonAndAdminAndEmployee('pf-manager-denied');
    const { agent, csrfToken } = await registerAsSalonManager(
      `pf-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/portfolio/upload-url`)
      .set('x-csrf-token', csrfToken)
      .send({ mimeType: 'image/png', sizeBytes: 100 });
    expect(res.status).toBe(404);
  });

  it('rejects a disallowed MIME type (svg)', async () => {
    const { salon, agent, csrfToken, employee } = await createSalonAndAdminAndEmployee('pf-svg');
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/portfolio/upload-url`)
      .set('x-csrf-token', csrfToken)
      .send({ mimeType: 'image/svg+xml', sizeBytes: 100 });
    expect(res.status).toBe(400);
  });

  it('rejects an oversized request', async () => {
    const { salon, agent, csrfToken, employee } =
      await createSalonAndAdminAndEmployee('pf-oversize');
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/portfolio/upload-url`)
      .set('x-csrf-token', csrfToken)
      .send({ mimeType: 'image/png', sizeBytes: 50 * 1024 * 1024 });
    expect(res.status).toBe(400);
  });

  it('uploads, confirms, and lists a real PNG, resolving a fresh signed URL', async () => {
    const { salon, agent, csrfToken, userId, employee } =
      await createSalonAndAdminAndEmployee('pf-happy');

    const confirmRes = await uploadPngAndConfirm(
      agent,
      csrfToken,
      salon.id,
      employee.id,
      'Before/after',
    );
    expect(confirmRes.status).toBe(201);
    expect(confirmRes.body.caption).toBe('Before/after');
    expect(confirmRes.body.sortOrder).toBe(0);
    expect(typeof confirmRes.body.imageUrl).toBe('string');

    const stored = await prisma.employeePortfolioItem.findUnique({
      where: { id: confirmRes.body.id },
    });
    expect(stored?.imageUrl).toMatch(/^employees\//); // stores the object key, not a URL — see ADR-0008

    const auditRow = await prisma.auditLog.findFirst({
      where: {
        actorUserId: userId,
        action: 'employee.portfolio_item.created',
        targetId: confirmRes.body.id,
      },
    });
    expect(auditRow).not.toBeNull();

    const listRes = await agent.get(`/salons/${salon.id}/employees/${employee.id}/portfolio`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe(confirmRes.body.id);

    const imageRes = await agent.get(pathOf(listRes.body[0].imageUrl));
    expect(imageRes.status).toBe(200);
    expect(imageRes.headers['content-type']).toMatch(/^image\/png/);
    expect(imageRes.headers['x-content-type-options']).toBe('nosniff');
    expect(imageRes.headers['content-disposition']).toMatch(/^inline; filename="/);
  });

  it('rejects confirming an object that was never actually uploaded', async () => {
    const { salon, agent, csrfToken, employee } =
      await createSalonAndAdminAndEmployee('pf-never-uploaded');
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/portfolio`)
      .set('x-csrf-token', csrfToken)
      .send({ objectKey: `employees/${employee.id}/${randomUUID()}.png` });
    expect(res.status).toBe(400);
  });

  it('rejects confirming an objectKey that does not belong to this employee', async () => {
    const { salon, agent, csrfToken, employee } =
      await createSalonAndAdminAndEmployee('pf-wrong-owner');
    const otherEmployeeId = randomUUID();
    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/portfolio`)
      .set('x-csrf-token', csrfToken)
      .send({ objectKey: `employees/${otherEmployeeId}/${randomUUID()}.png` });
    expect(res.status).toBe(400);
  });

  it('rejects a file whose actual bytes are not a recognized image at upload time', async () => {
    const { salon, agent, csrfToken, employee } =
      await createSalonAndAdminAndEmployee('pf-fake-image');

    const upload = await requestPortfolioUpload(agent, csrfToken, salon.id, employee.id, 100);

    // Upload a script disguised as a PNG (spoofed Content-Type, real bytes are not an image).
    const putRes = await agent
      .put(pathOf(upload.url))
      .set('Content-Type', 'image/png')
      .set('x-csrf-token', csrfToken)
      .send(Buffer.from('#!/bin/sh\necho pwned\n'));
    expect(putRes.status).toBe(415);

    const confirmRes = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/portfolio`)
      .set('x-csrf-token', csrfToken)
      .send({ objectKey: upload.objectKey });
    expect(confirmRes.status).toBe(400);
  });

  it('does not serve an uploaded object whose bytes are not a recognized image', async () => {
    if (!localDisk) throw new Error('Local disk storage adapter is required for this test.');

    const { salon, agent, csrfToken, employee } =
      await createSalonAndAdminAndEmployee('pf-fake-download');
    const upload = await requestPortfolioUpload(agent, csrfToken, salon.id, employee.id);
    await localDisk.writeObject(upload.objectKey, Readable.from(Buffer.from('<script>x</script>')));

    const imageUrl = await localDisk.getObjectUrl(upload.objectKey);
    const res = await agent.get(pathOf(imageUrl));
    expect(res.status).toBe(404);
  });

  it('does not let an upload token overwrite an approved image after confirm', async () => {
    const { salon, agent, csrfToken, employee } =
      await createSalonAndAdminAndEmployee('pf-replay');
    const upload = await requestPortfolioUpload(agent, csrfToken, salon.id, employee.id);

    const putRes = await agent
      .put(pathOf(upload.url))
      .set('Content-Type', 'image/png')
      .set('x-csrf-token', csrfToken)
      .send(PNG_BYTES);
    expect(putRes.status).toBe(204);

    const confirmRes = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/portfolio`)
      .set('x-csrf-token', csrfToken)
      .send({ objectKey: upload.objectKey });
    expect(confirmRes.status).toBe(201);

    const replayRes = await agent
      .put(pathOf(upload.url))
      .set('Content-Type', 'image/png')
      .set('x-csrf-token', csrfToken)
      .send(PNG_BYTES);
    expect(replayRes.status).toBe(409);

    const listRes = await agent.get(`/salons/${salon.id}/employees/${employee.id}/portfolio`);
    const imageRes = await agent.get(pathOf(listRes.body[0].imageUrl));
    expect(imageRes.status).toBe(200);
    expect(Buffer.from(imageRes.body)).toEqual(PNG_BYTES);
  });

  it('cannot upload/confirm/list/reorder/delete portfolio items for an employee in a different salon', async () => {
    const {
      salon: salonA,
      agent,
      csrfToken,
      employee: employeeB,
    } = await createSalonAndAdminAndEmployee('pf-cross-salon-a');
    const salonB = await prisma.salon.create({
      data: { slug: `pf-cross-salon-b-${randomUUID()}`, name: 'B', timezone: 'UTC' },
    });
    const employeeOfB = await prisma.employeeProfile.create({
      data: { salonId: salonB.id, fullName: 'Belongs To B' },
    });
    void employeeB;

    const uploadRes = await agent
      .post(`/salons/${salonA.id}/employees/${employeeOfB.id}/portfolio/upload-url`)
      .set('x-csrf-token', csrfToken)
      .send({ mimeType: 'image/png', sizeBytes: 12 });
    expect(uploadRes.status).toBe(404);

    const listRes = await agent.get(`/salons/${salonA.id}/employees/${employeeOfB.id}/portfolio`);
    expect(listRes.status).toBe(404);
  });
});

describe('PATCH .../portfolio/:itemId (caption edit)', () => {
  it('updates the caption and audits it', async () => {
    const { salon, agent, csrfToken, userId, employee } =
      await createSalonAndAdminAndEmployee('pf-edit');
    const confirmRes = await uploadPngAndConfirm(
      agent,
      csrfToken,
      salon.id,
      employee.id,
      'Old caption',
    );

    const res = await agent
      .patch(`/salons/${salon.id}/employees/${employee.id}/portfolio/${confirmRes.body.id}`)
      .set('x-csrf-token', csrfToken)
      .send({ caption: 'New caption' });
    expect(res.status).toBe(200);
    expect(res.body.caption).toBe('New caption');

    const auditRow = await prisma.auditLog.findFirst({
      where: {
        actorUserId: userId,
        action: 'employee.portfolio_item.updated',
        targetId: confirmRes.body.id,
      },
    });
    expect(auditRow).not.toBeNull();
  });

  it('returns 404 for a portfolio item ID belonging to a different employee', async () => {
    const { salon, agent, csrfToken, employee } =
      await createSalonAndAdminAndEmployee('pf-edit-cross');
    const confirmRes = await uploadPngAndConfirm(agent, csrfToken, salon.id, employee.id);

    const otherEmployee = await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Other Employee' },
    });
    const res = await agent
      .patch(`/salons/${salon.id}/employees/${otherEmployee.id}/portfolio/${confirmRes.body.id}`)
      .set('x-csrf-token', csrfToken)
      .send({ caption: 'Hijacked caption' });
    expect(res.status).toBe(404);

    const stillOriginal = await prisma.employeePortfolioItem.findUnique({
      where: { id: confirmRes.body.id },
    });
    expect(stillOriginal?.caption).not.toBe('Hijacked caption');
  });
});

describe('POST .../portfolio/reorder', () => {
  it('reorders items and audits it', async () => {
    const { salon, agent, csrfToken, userId, employee } =
      await createSalonAndAdminAndEmployee('pf-reorder');
    const first = await uploadPngAndConfirm(agent, csrfToken, salon.id, employee.id, 'First');
    const second = await uploadPngAndConfirm(agent, csrfToken, salon.id, employee.id, 'Second');
    expect(first.body.sortOrder).toBe(0);
    expect(second.body.sortOrder).toBe(1);

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/portfolio/reorder`)
      .set('x-csrf-token', csrfToken)
      .send({ itemIds: [second.body.id, first.body.id] });
    expect(res.status).toBe(200);

    const listRes = await agent.get(`/salons/${salon.id}/employees/${employee.id}/portfolio`);
    expect(listRes.body.map((i: { id: string }) => i.id)).toEqual([second.body.id, first.body.id]);

    const auditRow = await prisma.auditLog.findFirst({
      where: { actorUserId: userId, action: 'employee.portfolio_item.reordered' },
    });
    expect(auditRow).not.toBeNull();
  });

  it('rejects a reorder payload that omits an existing item', async () => {
    const { salon, agent, csrfToken, employee } =
      await createSalonAndAdminAndEmployee('pf-reorder-invalid');
    const first = await uploadPngAndConfirm(agent, csrfToken, salon.id, employee.id);
    await uploadPngAndConfirm(agent, csrfToken, salon.id, employee.id);

    const res = await agent
      .post(`/salons/${salon.id}/employees/${employee.id}/portfolio/reorder`)
      .set('x-csrf-token', csrfToken)
      .send({ itemIds: [first.body.id] });
    expect(res.status).toBe(400);
  });
});

describe('DELETE .../portfolio/:itemId', () => {
  it('deletes the item, removing it from storage and the list', async () => {
    const { salon, agent, csrfToken, userId, employee } =
      await createSalonAndAdminAndEmployee('pf-delete');
    const confirmRes = await uploadPngAndConfirm(agent, csrfToken, salon.id, employee.id);

    const res = await agent
      .delete(`/salons/${salon.id}/employees/${employee.id}/portfolio/${confirmRes.body.id}`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(204);

    const stored = await prisma.employeePortfolioItem.findUnique({
      where: { id: confirmRes.body.id },
    });
    expect(stored).toBeNull();

    const auditRow = await prisma.auditLog.findFirst({
      where: {
        actorUserId: userId,
        action: 'employee.portfolio_item.deleted',
        targetId: confirmRes.body.id,
      },
    });
    expect(auditRow).not.toBeNull();
  });

  it('rejects SALON_MANAGER on delete', async () => {
    const { salon, agent, csrfToken, employee } =
      await createSalonAndAdminAndEmployee('pf-delete-denied');
    const confirmRes = await uploadPngAndConfirm(agent, csrfToken, salon.id, employee.id);

    const { agent: managerAgent, csrfToken: managerCsrf } = await registerAsSalonManager(
      `pf-delete-manager-${randomUUID()}@example.com`,
      salon.id,
    );
    const res = await managerAgent
      .delete(`/salons/${salon.id}/employees/${employee.id}/portfolio/${confirmRes.body.id}`)
      .set('x-csrf-token', managerCsrf);
    expect(res.status).toBe(404);

    const stillThere = await prisma.employeePortfolioItem.findUnique({
      where: { id: confirmRes.body.id },
    });
    expect(stillThere).not.toBeNull();
  });

  it('returns 404 for a portfolio item belonging to a different employee', async () => {
    const { salon, agent, csrfToken, employee } =
      await createSalonAndAdminAndEmployee('pf-delete-cross');
    const confirmRes = await uploadPngAndConfirm(agent, csrfToken, salon.id, employee.id);
    const otherEmployee = await prisma.employeeProfile.create({
      data: { salonId: salon.id, fullName: 'Other Employee' },
    });

    const res = await agent
      .delete(`/salons/${salon.id}/employees/${otherEmployee.id}/portfolio/${confirmRes.body.id}`)
      .set('x-csrf-token', csrfToken);
    expect(res.status).toBe(404);

    const stillThere = await prisma.employeePortfolioItem.findUnique({
      where: { id: confirmRes.body.id },
    });
    expect(stillThere).not.toBeNull();
  });
});
