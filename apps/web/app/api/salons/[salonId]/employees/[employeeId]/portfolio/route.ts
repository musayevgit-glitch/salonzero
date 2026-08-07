import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../../lib/server/auth';
import { getStorageAdapter } from '../../../../../../../lib/server/storage';
import { confirmPortfolioItemSchema, MAX_PORTFOLIO_UPLOAD_BYTES } from '@salonomia/validation';
import { recordAudit } from '../../../../../../../lib/server/audit';
import { detectImageMime } from '@salonomia/storage';

async function toDetail(item: {
  id: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
  createdAt: Date;
}) {
  const storage = getStorageAdapter();
  return { ...item, imageUrl: await storage.getObjectUrl(item.imageUrl) };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string }> }
) {
  const { salonId, employeeId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId },
    select: { id: true },
  });
  if (!employee) return notFound();

  const items = await prisma.employeePortfolioItem.findMany({
    where: { employeeId },
    orderBy: { sortOrder: 'asc' },
  });

  const details = await Promise.all(items.map((item) => toDetail(item)));
  return NextResponse.json(details);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string }> }
) {
  const { salonId, employeeId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId },
    select: { id: true },
  });
  if (!employee) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = confirmPortfolioItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  if (!input.objectKey.startsWith(`employees/${employeeId}/`)) {
    return badRequest('This upload does not belong to this employee.');
  }

  const storage = getStorageAdapter();
  const stat = await storage.statObject(input.objectKey);
  if (!stat) {
    return badRequest('Upload not found. It may not have completed.');
  }
  if (stat.sizeBytes > MAX_PORTFOLIO_UPLOAD_BYTES) {
    await storage.deleteObject(input.objectKey);
    return badRequest('Uploaded file exceeds the allowed size limit.');
  }

  const head = await storage.readObjectHead(input.objectKey, 12);
  if (!head || !detectImageMime(head)) {
    await storage.deleteObject(input.objectKey);
    return badRequest('Uploaded file is not a recognized image format.');
  }

  const lastItem = await prisma.employeePortfolioItem.findFirst({
    where: { employeeId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const item = await prisma.employeePortfolioItem.create({
    data: {
      employeeId,
      imageUrl: input.objectKey,
      caption: input.caption ?? null,
      sortOrder: (lastItem?.sortOrder ?? -1) + 1,
    },
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'employee.portfolio_item.created',
    targetType: 'EmployeePortfolioItem',
    targetId: item.id,
    salonId,
  });

  const detail = await toDetail(item);
  return NextResponse.json(detail, { status: 201 });
}
