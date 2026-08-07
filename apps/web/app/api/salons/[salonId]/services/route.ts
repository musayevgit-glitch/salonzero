import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../lib/server/auth';
import { createServiceSchema, listServicesQuerySchema } from '@salonomia/validation';
import { recordAudit } from '../../../../../lib/server/audit';

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string }> }
) {
  const { salonId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());

  const parsed = listServicesQuerySchema.safeParse({
    page: searchParams.page ? Number(searchParams.page) : undefined,
    pageSize: searchParams.pageSize ? Number(searchParams.pageSize) : undefined,
    isActive: searchParams.isActive === 'true' ? true : searchParams.isActive === 'false' ? false : undefined,
    categoryId: searchParams.categoryId || undefined,
    search: searchParams.search || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid query parameters.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const query = parsed.data;
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;

  const where = {
    salonId,
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.service.findMany({
      where,
      select: SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.service.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

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

  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  if (input.categoryId) {
    const category = await prisma.serviceCategory.findFirst({
      where: { id: input.categoryId, salonId },
      select: { id: true },
    });
    if (!category) {
      return badRequest('categoryId must reference a category in this salon.');
    }
  }

  const service = await prisma.service.create({
    data: {
      salonId,
      categoryId: input.categoryId ?? null,
      name: input.name,
      description: input.description ?? null,
      priceAmount: input.priceAmount,
      currency: input.currency,
      durationMinutes: input.durationMinutes,
      bufferMinutes: input.bufferMinutes,
    },
    select: DETAIL_SELECT,
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'service.created',
    targetType: 'Service',
    targetId: service.id,
    salonId,
  });

  return NextResponse.json(service, { status: 201 });
}
