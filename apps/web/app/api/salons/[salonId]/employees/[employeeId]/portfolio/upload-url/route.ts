import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../../../lib/server/salon-context';
import { notFound } from '../../../../../../../../lib/server/auth';
import { handleImageUpload } from '../../../../../../../../lib/server/upload';
import { recordAudit } from '../../../../../../../../lib/server/audit';
import { MAX_PORTFOLIO_UPLOAD_BYTES } from '@salonomia/validation';

// POST — upload portfolio image and create item in one step (multipart/form-data with 'file' field)
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

  const result = await handleImageUpload(req, `employees/${employeeId}/portfolio`, MAX_PORTFOLIO_UPLOAD_BYTES);
  if (result instanceof NextResponse) return result;

  const lastItem = await prisma.employeePortfolioItem.findFirst({
    where: { employeeId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const item = await prisma.employeePortfolioItem.create({
    data: {
      employeeId,
      imageUrl: result.url,
      caption: null,
      sortOrder: (lastItem?.sortOrder ?? -1) + 1,
    },
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'employee.portfolio_item.created',
    targetType: 'EmployeePortfolioItem',
    targetId: item.id,
    salonId,
  });

  return NextResponse.json({ id: item.id, imageUrl: result.url, caption: null, sortOrder: item.sortOrder }, { status: 201 });
}
