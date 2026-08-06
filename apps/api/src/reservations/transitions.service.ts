import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type ReservationStatus } from '@salonomia/database';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { isEmployeeSlotAvailable, type EmployeeAvailabilityInput } from './availability/availability';
import type { ReservationDetail } from './reservations.service';

const RESERVATION_SELECT = {
  id: true,
  salonId: true,
  serviceId: true,
  employeeId: true,
  status: true,
  startAt: true,
  endAt: true,
  priceAmount: true,
  currency: true,
  customerNote: true,
  createdAt: true,
} as const;

const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN'] as const;
const SLOT_UNAVAILABLE_MESSAGE = 'This time is no longer available. Please choose another time.';

function isMissingRecord(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025';
}

function isExclusionConstraintViolation(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('reservation_no_overlap_per_employee');
}

@Injectable()
export class TransitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---- staff transitions (salon-scoped) --------------------------------------------------

  async confirm(salonId: string, reservationId: string, actorUserId: string): Promise<ReservationDetail> {
    const current = await this.findForStaff(salonId, reservationId);
    if (current.status === 'CONFIRMED') return current; // idempotent no-op
    if (current.status !== 'PENDING') {
      throw new ConflictException('Only a pending reservation can be confirmed.');
    }
    return this.applyStatus(current, 'CONFIRMED', actorUserId, 'reservation.confirmed');
  }

  async reject(
    salonId: string,
    reservationId: string,
    actorUserId: string,
    reason?: string,
  ): Promise<ReservationDetail> {
    const current = await this.findForStaff(salonId, reservationId);
    if (current.status === 'REJECTED') return current; // idempotent no-op
    if (current.status !== 'PENDING') {
      throw new ConflictException('Only a pending reservation can be rejected.');
    }
    return this.applyStatus(current, 'REJECTED', actorUserId, 'reservation.rejected', reason);
  }

  async cancelBySalon(
    salonId: string,
    reservationId: string,
    actorUserId: string,
    reason?: string,
  ): Promise<ReservationDetail> {
    const current = await this.findForStaff(salonId, reservationId);
    this.assertCancellableOrReschedulable(current.status);
    return this.applyStatus(
      current,
      'CANCELLED_BY_SALON',
      actorUserId,
      'reservation.cancelled_by_salon',
      reason,
      { cancelledAt: new Date() },
    );
  }

  async checkIn(salonId: string, reservationId: string, actorUserId: string): Promise<ReservationDetail> {
    const current = await this.findForStaff(salonId, reservationId);
    if (current.status !== 'CONFIRMED') {
      throw new ConflictException('Only a confirmed reservation can be checked in.');
    }
    return this.applyStatus(current, 'CHECKED_IN', actorUserId, 'reservation.checked_in');
  }

  async complete(salonId: string, reservationId: string, actorUserId: string): Promise<ReservationDetail> {
    const current = await this.findForStaff(salonId, reservationId);
    if (current.status !== 'CHECKED_IN') {
      throw new ConflictException('Only a checked-in reservation can be completed.');
    }
    return this.applyStatus(current, 'COMPLETED', actorUserId, 'reservation.completed', undefined, {
      completedAt: new Date(),
    });
  }

  async noShow(salonId: string, reservationId: string, actorUserId: string): Promise<ReservationDetail> {
    const current = await this.findForStaff(salonId, reservationId);
    if (current.status !== 'CONFIRMED') {
      throw new ConflictException('Only a confirmed reservation can be marked no-show.');
    }
    if (new Date().getTime() <= current.endAt.getTime()) {
      throw new ConflictException('A reservation can only be marked no-show after its scheduled time.');
    }
    return this.applyStatus(current, 'NO_SHOW', actorUserId, 'reservation.no_show');
  }

  async rescheduleBySalon(
    salonId: string,
    reservationId: string,
    actorUserId: string,
    newStartAt: Date,
    newEmployeeId?: string,
  ): Promise<ReservationDetail> {
    const current = await this.findForStaff(salonId, reservationId);
    this.assertCancellableOrReschedulable(current.status);
    return this.reschedule(current, newStartAt, newEmployeeId, actorUserId, null);
  }

  // ---- customer transitions (own reservation only) ---------------------------------------

  async cancelByCustomer(
    customerId: string,
    reservationId: string,
    reason?: string,
  ): Promise<ReservationDetail> {
    const current = await this.findForCustomer(customerId, reservationId);
    this.assertCancellableOrReschedulable(current.status);

    const policy = await this.prisma.bookingPolicy.findUnique({ where: { salonId: current.salonId } });
    const windowHours = policy?.cancellationWindowHours ?? 24;
    const deadline = current.startAt.getTime() - windowHours * 60 * 60_000;
    if (Date.now() >= deadline) {
      throw new ConflictException('This reservation can no longer be cancelled online.');
    }

    return this.applyStatus(
      current,
      'CANCELLED_BY_CUSTOMER',
      customerId,
      'reservation.cancelled_by_customer',
      reason,
      { cancelledAt: new Date() },
    );
  }

  async rescheduleByCustomer(
    customerId: string,
    reservationId: string,
    newStartAt: Date,
  ): Promise<ReservationDetail> {
    const current = await this.findForCustomer(customerId, reservationId);
    this.assertCancellableOrReschedulable(current.status);

    const policy = await this.prisma.bookingPolicy.findUnique({ where: { salonId: current.salonId } });
    const windowHours = policy?.rescheduleWindowHours ?? 24;
    const deadline = current.startAt.getTime() - windowHours * 60 * 60_000;
    if (Date.now() >= deadline) {
      throw new ConflictException('This reservation can no longer be rescheduled online.');
    }

    return this.reschedule(current, newStartAt, undefined, customerId, customerId);
  }

  // ---- shared internals --------------------------------------------------------------------

  // Cancellation and reschedule are only legal from PENDING/CONFIRMED per the state machine —
  // CHECKED_IN is non-terminal but must not be cancellable/reschedulable (an in-progress
  // appointment can only end via complete/no-show), so this is deliberately narrower than a
  // generic "not terminal" check.
  private assertCancellableOrReschedulable(status: ReservationStatus): void {
    if (status !== 'PENDING' && status !== 'CONFIRMED') {
      throw new ConflictException('This reservation can no longer be cancelled or rescheduled.');
    }
  }

  private async findForStaff(salonId: string, reservationId: string) {
    // salonId is the authorized SalonContext value — never trusted from the route param alone.
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, salonId },
      select: RESERVATION_SELECT,
    });
    if (!reservation) throw new NotFoundException();
    return reservation;
  }

  private async findForCustomer(customerId: string, reservationId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, customerId },
      select: RESERVATION_SELECT,
    });
    if (!reservation) throw new NotFoundException();
    return reservation;
  }

  private async applyStatus(
    current: { id: string; status: ReservationStatus; salonId: string },
    toStatus: ReservationStatus,
    actorUserId: string,
    action: string,
    reason?: string,
    extraData?: { completedAt?: Date; cancelledAt?: Date },
  ): Promise<ReservationDetail> {
    let updated: ReservationDetail;
    try {
      updated = await this.prisma.$transaction(async (tx) => {
        // The `status: current.status` filter makes this a compare-and-swap: a concurrent
        // transition on the same row will find zero matching rows and throw P2025, never silently
        // overwrite a state another request already moved past.
        const result = await tx.reservation.update({
          // salonId is redundant today (it's immutable), but scoping the actual write by it too
          // — not just the earlier findForStaff/findForCustomer lookup — matches CLAUDE.md's
          // "never query by ID first and authorize after" rule and stays correct if that ever changes.
          where: { id: current.id, status: current.status, salonId: current.salonId },
          data: { status: toStatus, ...extraData },
          select: RESERVATION_SELECT,
        });
        await tx.reservationStatusHistory.create({
          data: {
            reservationId: current.id,
            fromStatus: current.status as never,
            toStatus: toStatus as never,
            changedByUserId: actorUserId,
            reason,
          },
        });
        return result;
      });
    } catch (err) {
      if (isMissingRecord(err)) {
        throw new ConflictException('This reservation was already updated by someone else.');
      }
      throw err;
    }

    await this.audit.record({
      actorUserId,
      action,
      targetType: 'Reservation',
      targetId: current.id,
      salonId: current.salonId,
      metadata: { fromStatus: current.status, toStatus, reason: reason ?? null },
    });

    return updated;
  }

  private async reschedule(
    current: {
      id: string;
      salonId: string;
      serviceId: string;
      employeeId: string;
      status: ReservationStatus;
      startAt: Date;
    },
    newStartAt: Date,
    newEmployeeId: string | undefined,
    actorUserId: string,
    customerIdIfCustomer: string | null,
  ): Promise<ReservationDetail> {
    const salon = await this.prisma.salon.findUnique({
      where: { id: current.salonId },
      select: { timezone: true },
    });
    const service = await this.prisma.service.findUnique({
      where: { id: current.serviceId },
      select: { durationMinutes: true, bufferMinutes: true },
    });
    const policy = await this.prisma.bookingPolicy.findUnique({ where: { salonId: current.salonId } });
    if (!salon || !service || !policy) {
      throw new BadRequestException('This salon is not configured for booking.');
    }

    const targetEmployeeId = newEmployeeId ?? current.employeeId;
    if (newEmployeeId) {
      const employee = await this.prisma.employeeProfile.findFirst({
        where: {
          id: newEmployeeId,
          salonId: current.salonId,
          isActive: true,
          eligibleServices: { some: { serviceId: current.serviceId } },
        },
        select: { id: true },
      });
      if (!employee) {
        throw new BadRequestException('Invalid stylist for this service.');
      }
    }

    const availabilityInput = await this.loadEmployeeAvailabilityInput(
      targetEmployeeId,
      current.serviceId,
      newStartAt,
      current.id, // exclude the reservation being rescheduled from its own conflict check
    );
    const available = isEmployeeSlotAvailable({
      employee: availabilityInput,
      salonTimezone: salon.timezone,
      now: new Date(),
      candidateStart: newStartAt,
      serviceDurationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes,
      minNoticeMinutes: policy.minNoticeMinutes,
      maxAdvanceDays: policy.maxAdvanceDays,
    });
    if (!available) {
      throw new ConflictException(SLOT_UNAVAILABLE_MESSAGE);
    }

    const newEndAt = new Date(newStartAt.getTime() + service.durationMinutes * 60_000);

    let updated: ReservationDetail;
    try {
      updated = await this.prisma.$transaction(async (tx) => {
        // Release the old slot and acquire the new one in the same transaction/statement — the
        // EXCLUDE constraint (ADR-0005) still protects the new slot against a concurrent booking.
        const conflicting = await tx.reservation.count({
          where: {
            id: { not: current.id },
            employeeId: targetEmployeeId,
            status: { in: [...ACTIVE_RESERVATION_STATUSES] },
            startAt: { lt: newEndAt },
            endAt: { gt: newStartAt },
          },
        });
        if (conflicting > 0) {
          throw new ConflictException(SLOT_UNAVAILABLE_MESSAGE);
        }

        const result = await tx.reservation.update({
          where: { id: current.id, status: current.status, salonId: current.salonId },
          data: { employeeId: targetEmployeeId, startAt: newStartAt, endAt: newEndAt },
          select: RESERVATION_SELECT,
        });
        await tx.reservationStatusHistory.create({
          data: {
            reservationId: current.id,
            fromStatus: current.status as never,
            toStatus: current.status as never,
            changedByUserId: actorUserId,
            reason: `Rescheduled from ${current.startAt.toISOString()} to ${newStartAt.toISOString()}`,
          },
        });
        return result;
      });
    } catch (err) {
      if (isMissingRecord(err)) {
        throw new ConflictException('This reservation was already updated by someone else.');
      }
      if (isExclusionConstraintViolation(err)) {
        throw new ConflictException(SLOT_UNAVAILABLE_MESSAGE);
      }
      throw err;
    }

    await this.audit.record({
      actorUserId,
      action: 'reservation.rescheduled',
      targetType: 'Reservation',
      targetId: current.id,
      salonId: current.salonId,
      metadata: {
        fromStartAt: current.startAt.toISOString(),
        toStartAt: newStartAt.toISOString(),
        byCustomer: customerIdIfCustomer !== null,
      },
    });

    return updated;
  }

  private async loadEmployeeAvailabilityInput(
    employeeId: string,
    serviceId: string,
    aroundInstant: Date,
    excludeReservationId: string,
  ): Promise<EmployeeAvailabilityInput> {
    const windowStart = new Date(aroundInstant.getTime() - 24 * 60 * 60_000);
    const windowEnd = new Date(aroundInstant.getTime() + 24 * 60 * 60_000);

    const [employee, workingSchedule, breaks, timeOff, blockingReservations] = await Promise.all([
      this.prisma.employeeProfile.findUnique({
        where: { id: employeeId },
        select: {
          isActive: true,
          eligibleServices: { where: { serviceId }, select: { serviceId: true } },
        },
      }),
      this.prisma.workingSchedule.findMany({ where: { employeeId } }),
      this.prisma.break.findMany({ where: { employeeId } }),
      this.prisma.timeOff.findMany({
        where: { employeeId, startAt: { lt: windowEnd }, endAt: { gt: windowStart } },
      }),
      this.prisma.reservation.findMany({
        where: {
          employeeId,
          id: { not: excludeReservationId },
          status: { in: [...ACTIVE_RESERVATION_STATUSES] },
          startAt: { lt: windowEnd },
          endAt: { gt: windowStart },
        },
        select: { startAt: true, endAt: true },
      }),
    ]);

    return {
      employeeId,
      isActive: employee?.isActive ?? false,
      isEligibleForService: (employee?.eligibleServices.length ?? 0) > 0,
      workingSchedule,
      breaks,
      timeOff,
      blockingReservations,
    };
  }
}
