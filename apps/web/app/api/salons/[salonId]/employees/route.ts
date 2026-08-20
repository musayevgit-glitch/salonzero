import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../lib/server/auth';
import { createEmployeeSchema, listEmployeesQuerySchema } from '@salonomia/validation';
import { recordAudit } from '../../../../../lib/server/audit';

const SELECT = {
  id: true,
  fullName: true,
  bio: true,
  photoUrl: true,
  isActive: true,
  createdAt: true,
} as const;

const DETAIL_SELECT = { ...SELECT, updatedAt: true } as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ salonId: string }> }) {
  const { salonId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());

  const parsed = listEmployeesQuerySchema.safeParse({
    page: searchParams.page ? Number(searchParams.page) : undefined,
    pageSize: searchParams.pageSize ? Number(searchParams.pageSize) : undefined,
    isActive:
      searchParams.isActive === 'true'
        ? true
        : searchParams.isActive === 'false'
          ? false
          : undefined,
    search: searchParams.search || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid query parameters.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const query = parsed.data;
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;

  const where = {
    salonId,
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.search ? { fullName: { contains: query.search, mode: 'insensitive' as const } } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.employeeProfile.findMany({
      where,
      select: SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employeeProfile.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ salonId: string }> }) {
  const { salonId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid input.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const employee = await prisma.employeeProfile.create({
    data: { salonId, fullName: input.fullName, bio: input.bio },
    select: DETAIL_SELECT,
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'employee.created',
    targetType: 'EmployeeProfile',
    targetId: employee.id,
    salonId,
  });

  return NextResponse.json(employee, { status: 201 });
}
