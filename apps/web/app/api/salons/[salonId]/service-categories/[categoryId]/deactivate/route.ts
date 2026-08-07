import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../../lib/server/salon-context';
import { notFound } from '../../../../../../../lib/server/auth';
import { recordAudit } from '../../../../../../../lib/server/audit';

export async function POST(
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

  const updated = await prisma.serviceCategory.update({
    where: { id: categoryId, salonId },
    data: { isActive: false },
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'service_category.deactivated',
    targetType: 'ServiceCategory',
    targetId: categoryId,
    salonId,
  });

  return NextResponse.json(updated);
}
