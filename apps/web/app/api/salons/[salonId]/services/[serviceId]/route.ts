import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../lib/server/auth';
import { updateServiceSchema } from '@salonomia/validation';
import { recordAudit } from '../../../../../../lib/server/audit';

const SELECT = {
  id: true,
  categoryId: true,
  name: true,
  description: true,
  priceAmount: true,
  currency: true,
  durationMinutes: true,
  bufferMinutes: true,
  isActive: true,
  createdAt: true,
} as const;

const DETAIL_SELECT = { ...SELECT, updatedAt: true } as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; serviceId: string }> },
) {
  const { salonId, serviceId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const service = await prisma.service.findFirst({
    where: { id: serviceId, salonId },
    select: DETAIL_SELECT,
  });

  if (!service) return notFound();

  return NextResponse.json(service);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; serviceId: string }> },
) {
  const { salonId, serviceId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  const current = await prisma.service.findFirst({
    where: { id: serviceId, salonId },
  });
  if (!current) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid input.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;

  if (input.expectedUpdatedAt) {
    const expected = new Date(input.expectedUpdatedAt).getTime();
    if (expected !== current.updatedAt.getTime()) {
      return NextResponse.json(
        { message: 'This service was changed by someone else. Reload and try again.' },
        { status: 409 },
      );
    }
  }

  if (input.categoryId) {
    const category = await prisma.serviceCategory.findFirst({
      where: { id: input.categoryId, salonId },
      select: { id: true },
    });
    if (!category) {
      return badRequest('categoryId must reference a category in this salon.');
    }
  }

  const data: Record<string, unknown> = {};
  const editableFields = [
    'categoryId',
    'name',
    'description',
    'priceAmount',
    'currency',
    'durationMinutes',
    'bufferMinutes',
  ] as const;
  for (const field of editableFields) {
    if (field in input) data[field] = input[field];
  }

  const updated = await prisma.service.update({
    where: { id: serviceId, salonId },
    data,
    select: DETAIL_SELECT,
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'service.updated',
    targetType: 'Service',
    targetId: serviceId,
    salonId,
    metadata: { changedFields: Object.keys(data) },
  });

  return NextResponse.json(updated);
}
