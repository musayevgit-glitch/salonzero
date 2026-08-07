import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../../lib/server/salon-context';
import { notFound } from '../../../../../../../lib/server/auth';
import { recordAudit } from '../../../../../../../lib/server/audit';

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; serviceId: string }> }
) {
  const { salonId, serviceId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  const current = await prisma.service.findFirst({
    where: { id: serviceId, salonId },
  });
  if (!current) return notFound();

  const updated = await prisma.service.update({
    where: { id: serviceId, salonId },
    data: { isActive: false },
    select: DETAIL_SELECT,
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'service.deactivated',
    targetType: 'Service',
    targetId: serviceId,
    salonId,
  });

  return NextResponse.json(updated);
}
