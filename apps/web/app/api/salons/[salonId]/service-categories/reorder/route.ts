import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../lib/server/salon-context';
import { badRequest } from '../../../../../../lib/server/auth';
import { reorderServiceCategoriesSchema } from '@salonomia/validation';
import { recordAudit } from '../../../../../../lib/server/audit';

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

  const parsed = reorderServiceCategoriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  const existing = await prisma.serviceCategory.findMany({
    where: { salonId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((item) => item.id));
  const requestedIds = new Set(input.categoryIds);

  const sameSet =
    existingIds.size === requestedIds.size &&
    [...existingIds].every((id) => requestedIds.has(id));
  if (!sameSet) {
    return badRequest('categoryIds must be exactly the salon’s current categories.');
  }

  await prisma.$transaction(
    input.categoryIds.map((id, index) =>
      prisma.serviceCategory.update({
        where: { id, salonId },
        data: { sortOrder: index },
      })
    )
  );

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'service_category.reordered',
    targetType: 'Salon',
    targetId: salonId,
    salonId,
    metadata: { categoryIds: input.categoryIds },
  });

  return NextResponse.json({ ok: true });
}
