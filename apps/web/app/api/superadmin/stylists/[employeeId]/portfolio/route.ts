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

const uploadSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  sizeBytes: z.number().int().positive().max(5 * 1024 * 1024),
});

const confirmSchema = z.object({ objectKey: z.string().min(1), caption: z.string().max(200).optional() });

const reorderSchema = z.object({ itemIds: z.array(z.string()).min(1) });

// GET — list portfolio items
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { employeeId } = await params;
  const employee = await prisma.employeeProfile.findUnique({ where: { id: employeeId }, select: { id: true } });
  if (!employee) return notFound();

  const items = await prisma.employeePortfolioItem.findMany({
    where: { employeeId },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, imageUrl: true, caption: true, sortOrder: true },
  });

  return NextResponse.json(items);
}

// POST — request presigned upload URL for new portfolio item
export async function POST(
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

  // If body has objectKey, this is the confirm step
  const confirmParsed = confirmSchema.safeParse(body);
  if (confirmParsed.success && 'objectKey' in confirmParsed.data) {
    const storage = getStorageAdapter();
    const url = await storage.getObjectUrl(confirmParsed.data.objectKey);
    const maxOrder = await prisma.employeePortfolioItem.aggregate({ where: { employeeId }, _max: { sortOrder: true } });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
    const item = await prisma.employeePortfolioItem.create({
      data: { employeeId, imageUrl: url, caption: confirmParsed.data.caption ?? null, sortOrder },
    });
    await recordAudit({
      actorUserId: check.userId,
      action: 'stylist.portfolio_item_added',
      targetType: 'EmployeeProfile',
      targetId: employeeId,
      salonId: employee.salonId,
    });
    return NextResponse.json(item, { status: 201 });
  }

  // Otherwise request upload URL
  const uploadParsed = uploadSchema.safeParse(body);
  if (!uploadParsed.success) return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });

  const ext = ALLOWED_MIME[uploadParsed.data.mimeType]!;
  const objectKey = `employees/${employeeId}/portfolio/${randomUUID()}.${ext}`;
  const storage = getStorageAdapter();
  const target = await storage.createUploadTarget(objectKey, uploadParsed.data.mimeType, uploadParsed.data.sizeBytes);

  return NextResponse.json({ ...target, objectKey });
}

// PATCH — reorder items
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { employeeId } = await params;

  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('Invalid JSON.'); }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });

  await Promise.all(
    parsed.data.itemIds.map((id, index) =>
      prisma.employeePortfolioItem.update({ where: { id, employeeId }, data: { sortOrder: index } }),
    ),
  );

  return NextResponse.json({ ok: true });
}
