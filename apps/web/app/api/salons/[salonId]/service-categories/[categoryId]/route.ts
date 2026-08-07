import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../lib/server/auth';
import { updateServiceCategorySchema } from '@salonomia/validation';
import { recordAudit } from '../../../../../../lib/server/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; categoryId: string }> }
) {
  const { salonId, categoryId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const category = await prisma.serviceCategory.findFirst({
    where: { id: categoryId, salonId },
  });
  if (!category) return notFound();

  return NextResponse.json(category);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; categoryId: string }> }
) {
  const { salonId, categoryId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  const current = await prisma.serviceCategory.findFirst({
    where: { id: categoryId, salonId },
  });
  if (!current) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = updateServiceCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  if (input.expectedUpdatedAt) {
    const expected = new Date(input.expectedUpdatedAt).getTime();
    if (expected !== current.updatedAt.getTime()) {
      return NextResponse.json({ message: 'This category was changed by someone else. Reload and try again.' }, { status: 409 });
    }
  }

  if (input.name && input.name !== current.name) {
    const existing = await prisma.serviceCategory.findFirst({
      where: { salonId, name: input.name, id: { not: categoryId } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ message: 'A category with this name already exists.' }, { status: 409 });
    }
  }

  const updated = await prisma.serviceCategory.update({
    where: { id: categoryId, salonId },
    data: { name: input.name },
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'service_category.updated',
    targetType: 'ServiceCategory',
    targetId: categoryId,
    salonId,
    metadata: { changedFields: ['name'] },
  });

  return NextResponse.json(updated);
}
