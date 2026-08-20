import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../lib/server/auth';
import { recordAudit } from '../../../../../../lib/server/audit';
import { handleImageUpload } from '../../../../../../lib/server/upload';
import { z } from 'zod';

const reorderSchema = z.object({ itemIds: z.array(z.string()).min(1) });

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { employeeId } = await params;
  const employee = await prisma.employeeProfile.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });
  if (!employee) return notFound();

  const items = await prisma.employeePortfolioItem.findMany({
    where: { employeeId },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, imageUrl: true, caption: true, sortOrder: true },
  });

  return NextResponse.json(items);
}

// POST — upload image + create portfolio item (multipart/form-data with 'file' and optional 'caption')
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { employeeId } = await params;
  const employee = await prisma.employeeProfile.findUnique({
    where: { id: employeeId },
    select: { id: true, salonId: true },
  });
  if (!employee) return notFound();

  const result = await handleImageUpload(req, `employees/${employeeId}/portfolio`, 5 * 1024 * 1024);
  if (result instanceof NextResponse) return result;

  const maxOrder = await prisma.employeePortfolioItem.aggregate({
    where: { employeeId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const item = await prisma.employeePortfolioItem.create({
    data: { employeeId, imageUrl: result.url, caption: null, sortOrder },
    select: { id: true, imageUrl: true, caption: true, sortOrder: true },
  });

  await recordAudit({
    actorUserId: check.userId,
    action: 'stylist.portfolio_item_added',
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId: employee.salonId,
  });

  return NextResponse.json(item, { status: 201 });
}

// PATCH — reorder items
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { employeeId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON.');
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });

  await Promise.all(
    parsed.data.itemIds.map((id, index) =>
      prisma.employeePortfolioItem.update({
        where: { id, employeeId },
        data: { sortOrder: index },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
