import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../lib/server/salon-context';
import { ReservationStatus } from '@salonomia/database';

const VALID_STATUSES = Object.values(ReservationStatus);

export async function GET(req: NextRequest) {
  const check = requireSuperadmin(req);
  if (check instanceof NextResponse) return check;

  const { searchParams } = req.nextUrl;
  const salonId = searchParams.get('salonId') ?? '';
  const employeeId = searchParams.get('employeeId') ?? '';
  const serviceId = searchParams.get('serviceId') ?? '';
  const status = searchParams.get('status') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const search = searchParams.get('search') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));

  type ReservationWhere = {
    salonId?: string;
    employeeId?: string;
    serviceId?: string;
    status?: ReservationStatus;
    startAt?: { gte?: Date; lte?: Date };
    OR?: Array<{
      service?: { name: { contains: string; mode: 'insensitive' } };
      employee?: { fullName: { contains: string; mode: 'insensitive' } };
      customer?: { fullName: { contains: string; mode: 'insensitive' } };
      guestName?: { contains: string; mode: 'insensitive' };
    }>;
  };

  const where: ReservationWhere = {};
  if (salonId) where.salonId = salonId;
  if (employeeId) where.employeeId = employeeId;
  if (serviceId) where.serviceId = serviceId;
  if (status && VALID_STATUSES.includes(status as ReservationStatus)) {
    where.status = status as ReservationStatus;
  }
  if (from || to) {
    where.startAt = {};
    if (from) where.startAt.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) where.startAt.lte = new Date(`${to}T23:59:59.999Z`);
  }
  if (search) {
    where.OR = [
      { service: { name: { contains: search, mode: 'insensitive' } } },
      { employee: { fullName: { contains: search, mode: 'insensitive' } } },
      { customer: { fullName: { contains: search, mode: 'insensitive' } } },
      { guestName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      orderBy: { startAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        priceAmount: true,
        currency: true,
        guestName: true,
        createdAt: true,
        salon: { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true } },
        customer: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.reservation.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      status: r.status,
      startAt: r.startAt,
      endAt: r.endAt,
      priceAmount: r.priceAmount,
      currency: r.currency,
      customerName: r.guestName ?? r.customer.fullName,
      customerEmail: r.customer.email,
      customerId: r.customer.id,
      salonId: r.salon.id,
      salonName: r.salon.name,
      serviceId: r.service.id,
      serviceName: r.service.name,
      employeeId: r.employee.id,
      employeeName: r.employee.fullName,
      createdAt: r.createdAt,
    })),
    total,
    page,
    pageSize,
  });
}
