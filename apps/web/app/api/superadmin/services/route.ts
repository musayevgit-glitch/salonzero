import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../lib/server/salon-context';
import { badRequest } from '../../../../lib/server/auth';
import { recordAudit } from '../../../../lib/server/audit';
import { z } from 'zod';

const createServiceSchema = z.object({
  salonId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  priceAmount: z.number().int().min(0),
  currency: z.string().length(3),
  durationMinutes: z.number().int().min(5).max(480),
  bufferMinutes: z.number().int().min(0).max(120).default(0),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') ?? '';
  const salonId = searchParams.get('salonId') ?? '';
  const categoryId = searchParams.get('categoryId') ?? '';
  const statusParam = searchParams.get('status') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));

  type WhereClause = {
    salonId?: string;
    categoryId?: string;
    isActive?: boolean;
    OR?: Array<{
      name?: { contains: string; mode: 'insensitive' };
      salon?: { name: { contains: string; mode: 'insensitive' } };
    }>;
  };
  const where: WhereClause = {};

  if (salonId) where.salonId = salonId;
  if (categoryId) where.categoryId = categoryId;
  if (statusParam === 'ACTIVE') where.isActive = true;
  else if (statusParam === 'INACTIVE') where.isActive = false;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { salon: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        priceAmount: true,
        currency: true,
        durationMinutes: true,
        bufferMinutes: true,
        isActive: true,
        createdAt: true,
        salon: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        _count: { select: { employees: true, reservations: true } },
      },
    }),
    prisma.service.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((s) => ({
      id: s.id,
      name: s.name,
      priceAmount: s.priceAmount,
      currency: s.currency,
      durationMinutes: s.durationMinutes,
      bufferMinutes: s.bufferMinutes,
      isActive: s.isActive,
      createdAt: s.createdAt,
      salonId: s.salon.id,
      salonName: s.salon.name,
      categoryId: s.category?.id ?? null,
      categoryName: s.category?.name ?? null,
      assignedStylistCount: s._count.employees,
      reservationCount: s._count.reservations,
    })),
    total,
    page,
    pageSize,
  });
}

export async function POST(req: NextRequest) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON.');
  }

  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid input.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { salonId, categoryId, ...rest } = parsed.data;

  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { id: true } });
  if (!salon) return NextResponse.json({ message: 'Salon not found.' }, { status: 404 });

  if (categoryId) {
    const cat = await prisma.serviceCategory.findFirst({ where: { id: categoryId, salonId } });
    if (!cat) return badRequest('Category does not belong to this salon.');
  }

  const service = await prisma.service.create({
    data: { salonId, categoryId: categoryId ?? null, ...rest },
    select: { id: true, name: true, salonId: true },
  });

  await recordAudit({
    actorUserId: check.userId,
    action: 'service.created_by_admin',
    targetType: 'Service',
    targetId: service.id,
    salonId,
    metadata: { name: service.name },
  });

  return NextResponse.json(service, { status: 201 });
}
