import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../../lib/server/auth';
import { recordAudit } from '../../../../../../../lib/server/audit';
import { z } from 'zod';

const patchSchema = z.object({ caption: z.string().max(200).nullable().optional() });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string; itemId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { employeeId, itemId } = await params;
  const item = await prisma.employeePortfolioItem.findFirst({ where: { id: itemId, employeeId } });
  if (!item) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON.');
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });

  const updated = await prisma.employeePortfolioItem.update({
    where: { id: itemId },
    data: { caption: parsed.data.caption },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string; itemId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { employeeId, itemId } = await params;
  const item = await prisma.employeePortfolioItem.findFirst({
    where: { id: itemId, employeeId },
    select: { id: true, employee: { select: { salonId: true } } },
  });
  if (!item) return notFound();

  await prisma.employeePortfolioItem.delete({ where: { id: itemId } });

  await recordAudit({
    actorUserId: check.userId,
    action: 'stylist.portfolio_item_deleted',
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId: item.employee.salonId,
  });

  return new NextResponse(null, { status: 204 });
}
