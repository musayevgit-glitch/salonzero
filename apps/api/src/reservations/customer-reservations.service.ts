import { Injectable, NotFoundException } from '@nestjs/common';
import type { ListCustomerReservationsQuery } from '@salonomia/validation';
import { ReservationStatus } from '@salonomia/database';
import { PrismaService } from '../prisma/prisma.service';

const LIST_SELECT = {
  id: true,
  status: true,
  startAt: true,
  endAt: true,
  priceAmount: true,
  currency: true,
  service: { select: { name: true, durationMinutes: true } },
  employee: { select: { fullName: true } },
  salon: { select: { name: true, slug: true } },
} as const;

const DETAIL_SELECT = {
  id: true,
  status: true,
  startAt: true,
  endAt: true,
  priceAmount: true,
  currency: true,
  customerNote: true,
  createdAt: true,
  service: { select: { id: true, name: true, durationMinutes: true } },
  employee: { select: { id: true, fullName: true } },
  salon: {
    select: {
      id: true,
      name: true,
      slug: true,
      timezone: true,
      bookingPolicy: {
        select: { cancellationWindowHours: true, rescheduleWindowHours: true },
      },
    },
  },
} as const;

@Injectable()
export class CustomerReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(customerId: string, query: ListCustomerReservationsQuery): Promise<unknown> {
    const where = {
      customerId,
      ...(query.status ? { status: query.status as ReservationStatus } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { startAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.reservation.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async detail(customerId: string, reservationId: string): Promise<unknown> {
    const r = await this.prisma.reservation.findFirst({
      where: { id: reservationId, customerId },
      select: DETAIL_SELECT,
    });
    if (!r) throw new NotFoundException('Reservation not found.');

    const now = new Date();
    const policy = r.salon.bookingPolicy;
    const cancelWindow = (policy?.cancellationWindowHours ?? 24) * 3_600_000;
    const rescheduleWindow = (policy?.rescheduleWindowHours ?? 24) * 3_600_000;
    const cancellable = ['PENDING', 'CONFIRMED'].includes(r.status);
    const reschedulable = cancellable;

    return {
      ...r,
      canCancel: cancellable && r.startAt.getTime() - now.getTime() > cancelWindow,
      canReschedule: reschedulable && r.startAt.getTime() - now.getTime() > rescheduleWindow,
    };
  }
}
