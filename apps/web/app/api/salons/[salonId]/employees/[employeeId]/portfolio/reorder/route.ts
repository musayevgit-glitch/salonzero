import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../../lib/server/prisma';
import {
  getSalonContext,
  isSalonContextError,
} from '../../../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../../../lib/server/auth';
import { reorderPortfolioSchema } from '@salonomia/validation';
import { recordAudit } from '../../../../../../../../lib/server/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string }> },
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

  const parsed = reorderPortfolioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid input.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const existing = await prisma.employeePortfolioItem.findMany({
    where: { employeeId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((item) => item.id));
  const requestedIds = new Set(input.itemIds);

  const sameSet =
    existingIds.size === requestedIds.size && [...existingIds].every((id) => requestedIds.has(id));
  if (!sameSet) {
    return badRequest('itemIds must be exactly the employee’s current portfolio items.');
  }

  await prisma.$transaction(
    input.itemIds.map((id, index) =>
      prisma.employeePortfolioItem.update({
        where: { id, employeeId },
        data: { sortOrder: index },
      }),
    ),
  );

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'employee.portfolio_item.reordered',
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId,
    metadata: { itemIds: input.itemIds },
  });

  return NextResponse.json({ ok: true });
}
