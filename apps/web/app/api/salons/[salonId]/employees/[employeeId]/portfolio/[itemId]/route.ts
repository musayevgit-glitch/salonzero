import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../../../lib/server/auth';
import { getStorageAdapter } from '../../../../../../../../lib/server/storage';
import { updatePortfolioItemSchema } from '@salonomia/validation';
import { recordAudit } from '../../../../../../../../lib/server/audit';

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string; itemId: string }> }
) {
  const { salonId, employeeId, itemId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId },
    select: { id: true },
  });
  if (!employee) return notFound();

  const current = await prisma.employeePortfolioItem.findFirst({
    where: { id: itemId, employeeId },
  });
  if (!current) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = updatePortfolioItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  const updated = await prisma.employeePortfolioItem.update({
    where: { id: itemId, employeeId },
    data: { caption: input.caption },
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'employee.portfolio_item.updated',
    targetType: 'EmployeePortfolioItem',
    targetId: itemId,
    salonId,
  });

  const detail = await toDetail(updated);
  return NextResponse.json(detail);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string; itemId: string }> }
) {
  const { salonId, employeeId, itemId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId },
    select: { id: true },
  });
  if (!employee) return notFound();

  const current = await prisma.employeePortfolioItem.findFirst({
    where: { id: itemId, employeeId },
  });
  if (!current) return notFound();

  await prisma.employeePortfolioItem.delete({ where: { id: itemId, employeeId } });

  const storage = getStorageAdapter();
  await storage.deleteObject(current.imageUrl).catch(() => undefined);

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'employee.portfolio_item.deleted',
    targetType: 'EmployeePortfolioItem',
    targetId: itemId,
    salonId,
  });

  return NextResponse.json({ ok: true });
}
