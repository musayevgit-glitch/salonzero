import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../../../lib/server/salon-context';
import { notFound } from '../../../../../../lib/server/auth';
import { recordAudit } from '../../../../../../lib/server/audit';
import { handleImageUpload } from '../../../../../../lib/server/upload';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { salonId } = await params;
  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { id: true } });
  if (!salon) return notFound();

  const result = await handleImageUpload(req, `salons/${salonId}/logo`, 5 * 1024 * 1024);
  if (result instanceof NextResponse) return result;

  await prisma.salon.update({ where: { id: salonId }, data: { logoUrl: result.url } });
  await recordAudit({ actorUserId: check.userId, action: 'salon.logo_updated', targetType: 'Salon', targetId: salonId, salonId });

  return NextResponse.json({ logoUrl: result.url });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { salonId } = await params;
  await prisma.salon.update({ where: { id: salonId }, data: { logoUrl: null } });
  await recordAudit({ actorUserId: check.userId, action: 'salon.logo_removed', targetType: 'Salon', targetId: salonId, salonId });

  return new NextResponse(null, { status: 204 });
}
