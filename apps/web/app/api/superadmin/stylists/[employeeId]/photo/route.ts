import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../lib/server/auth';
import { recordAudit } from '../../../../../../lib/server/audit';
import { getStorageAdapter } from '../../../../../../lib/server/storage';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const requestUploadSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
});

const confirmSchema = z.object({ objectKey: z.string().min(1) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { employeeId } = await params;
  const employee = await prisma.employeeProfile.findUnique({ where: { id: employeeId }, select: { id: true } });
  if (!employee) return notFound();

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('Invalid JSON.'); }

  const parsed = requestUploadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });

  const ext = ALLOWED_MIME[parsed.data.mimeType]!;
  const objectKey = `employees/${employeeId}/profile/${randomUUID()}.${ext}`;
  const storage = getStorageAdapter();
  const target = await storage.createUploadTarget(objectKey, parsed.data.mimeType, parsed.data.sizeBytes);

  return NextResponse.json({ ...target, objectKey });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { employeeId } = await params;
  const employee = await prisma.employeeProfile.findUnique({ where: { id: employeeId }, select: { id: true, salonId: true } });
  if (!employee) return notFound();

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('Invalid JSON.'); }

  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });

  const storage = getStorageAdapter();
  const url = await storage.getObjectUrl(parsed.data.objectKey);

  await prisma.employeeProfile.update({ where: { id: employeeId }, data: { photoUrl: url } });

  await recordAudit({
    actorUserId: check.userId,
    action: 'stylist.photo_updated',
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId: employee.salonId,
  });

  return NextResponse.json({ photoUrl: url });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { employeeId } = await params;
  const employee = await prisma.employeeProfile.findUnique({ where: { id: employeeId }, select: { id: true, salonId: true } });
  if (!employee) return notFound();

  await prisma.employeeProfile.update({ where: { id: employeeId }, data: { photoUrl: null } });

  await recordAudit({
    actorUserId: check.userId,
    action: 'stylist.photo_removed',
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId: employee.salonId,
  });

  return new NextResponse(null, { status: 204 });
}
