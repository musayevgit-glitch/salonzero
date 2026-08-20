import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../lib/server/salon-context';
import { badRequest } from '../../../../../lib/server/auth';
import { listSalonReservationsQuerySchema } from '@salonomia/validation';
import { computeStaffAvailableActions } from '../../../../../lib/server/reservation-actions';

const STAFF_RESERVATION_SELECT = {
  id: true,
  status: true,
  startAt: true,
  endAt: true,
  priceAmount: true,
  currency: true,
  customerNote: true,
  guestName: true,
  createdAt: true,
  service: { select: { id: true, name: true } },
  employee: { select: { id: true, fullName: true } },
  customer: { select: { email: true } },
} as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ salonId: string }> }) {
  const { salonId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());

  const parsed = listSalonReservationsQuerySchema.safeParse({
    page: searchParams.page ? Number(searchParams.page) : undefined,
    pageSize: searchParams.pageSize ? Number(searchParams.pageSize) : undefined,
    status: searchParams.status || undefined,
    employeeId: searchParams.employeeId || undefined,
    from: searchParams.from || undefined,
    to: searchParams.to || undefined,
    search: searchParams.search || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid query parameters.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const query = parsed.data;

  let filterEmployeeId = query.employeeId;
  if (ctx.role === 'SALON_MANAGER') {
    const employee = await prisma.employeeProfile.findFirst({
      where: { salonId, userId: ctx.userId },
      select: { id: true },
    });
    if (!employee) {
      return NextResponse.json({ items: [], total: 0, page: query.page, pageSize: query.pageSize });
    }
    filterEmployeeId = employee.id;
  }

  const where = {
    salonId,
    ...(query.from || query.to
      ? {
          startAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lt: new Date(query.to) } : {}),
          },
        }
      : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(filterEmployeeId ? { employeeId: filterEmployeeId } : {}),
    ...(query.search
      ? {
          customer: {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      select: STAFF_RESERVATION_SELECT,
      orderBy: { startAt: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.reservation.count({ where }),
  ]);

  const now = new Date();
  const items = rows.map((row) => ({
    ...row,
    availableActions: computeStaffAvailableActions(row.status, row.endAt, now),
  }));

  return NextResponse.json({ items, total, page: query.page, pageSize: query.pageSize });
}
