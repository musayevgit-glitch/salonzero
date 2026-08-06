import { Injectable, NotFoundException } from '@nestjs/common';
import type { ListSalonReservationsQuery } from '@salonomia/validation';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeStaffAvailableActions,
  type StaffReservationAction,
} from './reservation-actions';

// SEC-002: guestName (manager-snapshotted) is returned instead of customer.fullName/id to prevent
// cross-tenant account-existence enumeration. customer.email is still returned for operational use
// (the manager booked that email, so it is their data), but the global user id is never exposed.
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

export interface StaffReservationDetail {
  id: string;
  status: string;
  startAt: Date;
  endAt: Date;
  priceAmount: number;
  currency: string;
  customerNote: string | null;
  guestName: string | null;
  createdAt: Date;
  service: { id: string; name: string };
  employee: { id: string; fullName: string };
  customer: { email: string };
  availableActions: StaffReservationAction[];
}

@Injectable()
export class StaffReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    salonId: string,
    query: ListSalonReservationsQuery,
  ): Promise<{ items: StaffReservationDetail[]; total: number; page: number; pageSize: number }> {
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
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
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
      this.prisma.reservation.findMany({
        where,
        select: STAFF_RESERVATION_SELECT,
        orderBy: { startAt: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.reservation.count({ where }),
    ]);

    const now = new Date();
    return {
      items: rows.map((row) => this.withActions(row, now)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  // Minimal, read-only lookup data the manual-booking form needs (active services/employees only —
  // name/duration/price for services, name only for employees). Deliberately not the full
  // employee/service management surface (bio, portfolio, categories, inactive records, edit) —
  // SALON_MANAGER may book on a customer's behalf but must not manage employees or services.
  async getBookingOptions(
    salonId: string,
  ): Promise<{
    services: { id: string; name: string; durationMinutes: number; priceAmount: number; currency: string }[];
    employees: { id: string; fullName: string }[];
  }> {
    const [services, employees] = await Promise.all([
      this.prisma.service.findMany({
        where: { salonId, isActive: true },
        select: { id: true, name: true, durationMinutes: true, priceAmount: true, currency: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.employeeProfile.findMany({
        where: { salonId, isActive: true },
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' },
      }),
    ]);
    return { services, employees };
  }

  async detail(salonId: string, reservationId: string): Promise<StaffReservationDetail> {
    const row = await this.prisma.reservation.findFirst({
      where: { id: reservationId, salonId },
      select: STAFF_RESERVATION_SELECT,
    });
    if (!row) throw new NotFoundException();
    return this.withActions(row, new Date());
  }

  private withActions(
    row: Omit<StaffReservationDetail, 'availableActions'>,
    now: Date,
  ): StaffReservationDetail {
    return {
      ...row,
      availableActions: computeStaffAvailableActions(row.status as never, row.endAt, now),
    };
  }
}
