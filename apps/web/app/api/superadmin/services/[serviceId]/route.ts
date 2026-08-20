import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../lib/server/auth';
import { recordAudit } from '../../../../../lib/server/audit';
import { z } from 'zod';

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  priceAmount: z.number().int().min(0).optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  isActive: z.boolean().optional(),
});

const DETAIL_SELECT = {
  id: true,
  name: true,
  description: true,
  priceAmount: true,
  currency: true,
  durationMinutes: true,
  bufferMinutes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  salon: { select: { id: true, name: true, timezone: true } },
  category: { select: { id: true, name: true } },
  employees: {
    select: {
      employee: { select: { id: true, fullName: true, isActive: true, photoUrl: true } },
    },
  },
  _count: { select: { reservations: true } },
} as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { serviceId } = await params;
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: DETAIL_SELECT,
  });
  if (!service) return notFound();

  return NextResponse.json({
    ...service,
    assignedStylists: service.employees.map((e) => e.employee),
    reservationCount: service._count.reservations,
    employees: undefined,
    _count: undefined,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { serviceId } = await params;
  const current = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, salonId: true, name: true },
  });
  if (!current) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON.');
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid input.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) data[k] = v;
  }

  if (data.categoryId !== undefined && data.categoryId !== null) {
    const cat = await prisma.serviceCategory.findFirst({
      where: { id: data.categoryId as string, salonId: current.salonId },
    });
    if (!cat) return badRequest('Category does not belong to this salon.');
  }

  const updated = await prisma.service.update({
    where: { id: serviceId },
    data,
    select: DETAIL_SELECT,
  });

  await recordAudit({
    actorUserId: check.userId,
    action: 'service.updated_by_admin',
    targetType: 'Service',
    targetId: serviceId,
    salonId: current.salonId,
    metadata: { changedFields: Object.keys(data) },
  });

  return NextResponse.json({
    ...updated,
    assignedStylists: updated.employees.map((e) => e.employee),
    reservationCount: updated._count.reservations,
    employees: undefined,
    _count: undefined,
  });
}
