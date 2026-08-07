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
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});

const confirmSchema = z.object({ objectKey: z.string().min(1) });

// POST /api/superadmin/salons/[salonId]/cover-photo — request presigned upload URL
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { salonId } = await params;
  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { id: true } });
  if (!salon) return notFound();

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('Invalid JSON.'); }

  const parsed = requestUploadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });

  const ext = ALLOWED_MIME[parsed.data.mimeType]!;
  const objectKey = `salons/${salonId}/cover/${randomUUID()}.${ext}`;
  const storage = getStorageAdapter();
  const target = await storage.createUploadTarget(objectKey, parsed.data.mimeType, parsed.data.sizeBytes);

  return NextResponse.json({ ...target, objectKey });
}

// PATCH /api/superadmin/salons/[salonId]/cover-photo — confirm upload and save URL
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { salonId } = await params;
  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { id: true } });
  if (!salon) return notFound();

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('Invalid JSON.'); }

  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });

  const storage = getStorageAdapter();
  const url = await storage.getObjectUrl(parsed.data.objectKey);

  await prisma.salon.update({ where: { id: salonId }, data: { coverUrl: url } });

  await recordAudit({
    actorUserId: check.userId,
    action: 'salon.cover_photo_updated',
    targetType: 'Salon',
    targetId: salonId,
    salonId,
  });

  return NextResponse.json({ coverUrl: url });
}

// DELETE /api/superadmin/salons/[salonId]/cover-photo — remove cover photo
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { salonId } = await params;
  await prisma.salon.update({ where: { id: salonId }, data: { coverUrl: null } });

  await recordAudit({
    actorUserId: check.userId,
    action: 'salon.cover_photo_removed',
    targetType: 'Salon',
    targetId: salonId,
    salonId,
  });

  return new NextResponse(null, { status: 204 });
}
