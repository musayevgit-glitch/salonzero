import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../lib/server/auth';
import { createServiceCategorySchema } from '@salonomia/validation';
import { recordAudit } from '../../../../../lib/server/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string }> }
) {
  const { salonId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const categories = await prisma.serviceCategory.findMany({
    where: { salonId },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json(categories);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string }> }
) {
  const { salonId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = createServiceCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  // Check if name is unique
  const existing = await prisma.serviceCategory.findFirst({
    where: { salonId, name: input.name },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ message: 'A category with this name already exists.' }, { status: 409 });
  }

  const last = await prisma.serviceCategory.findFirst({
    where: { salonId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const category = await prisma.serviceCategory.create({
    data: { salonId, name: input.name, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'service_category.created',
    targetType: 'ServiceCategory',
    targetId: category.id,
    salonId,
  });

  return NextResponse.json(category, { status: 201 });
}
