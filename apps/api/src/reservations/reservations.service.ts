import * as crypto from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@salonomia/database';
import type { CreateManualReservationInput, CreateReservationInput } from '@salonomia/validation';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  isEmployeeSlotAvailable,
  type EmployeeAvailabilityInput,
} from './availability/availability';

export interface ReservationDetail {
  id: string;
  salonId: string;
  serviceId: string;
  employeeId: string;
  status: string;
  startAt: Date;
  endAt: Date;
  priceAmount: number;
  currency: string;
  customerNote: string | null;
  guestName: string | null;
  createdAt: Date;
}

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
  guestName: true,
  createdAt: true,
} as const;

// Active statuses are the only ones a new booking (or the double-booking exclusion constraint)
// needs to treat as a conflict — see docs/architecture/reservation-state-machine.md.
const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN'] as const;

// A generic, privacy-safe message — never reveals *why* a slot is unavailable (another customer's
// booking, a break, time off) or any detail about who holds it.
const SLOT_UNAVAILABLE_MESSAGE = 'This time is no longer available. Please choose another time.';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(customerId: string, input: CreateReservationInput): Promise<ReservationDetail> {
    // Idempotency: a replayed request (double-click, retried timeout) with the same key returns
    // the original reservation instead of creating a duplicate — never trust the client to only
    // submit once (docs/architecture/reservation-state-machine.md).
    const existing = await this.prisma.reservation.findUnique({
      where: { customerId_idempotencyKey: { customerId, idempotencyKey: input.idempotencyKey } },
      select: RESERVATION_SELECT,
    });
    if (existing) {
      return existing;
    }

    const salon = await this.prisma.salon.findFirst({
      where: { id: input.salonId, status: 'ACTIVE' },
      select: { id: true, timezone: true },
    });
    if (!salon) {
      throw new NotFoundException('Salon not found.');
    }

    const service = await this.prisma.service.findFirst({
      where: { id: input.serviceId, salonId: salon.id, isActive: true },
      select: {
        id: true,
        durationMinutes: true,
        bufferMinutes: true,
        priceAmount: true,
        currency: true,
      },
    });
    if (!service) {
      throw new BadRequestException('This service is not available at this salon.');
    }

    const bookingPolicy = await this.prisma.bookingPolicy.findUnique({
      where: { salonId: salon.id },
    });
    if (!bookingPolicy) {
      // Every salon is created with a BookingPolicy (Section 11.2) — reaching this means a data
      // integrity problem, not a client input problem.
      throw new BadRequestException('This salon is not configured for booking.');
    }

    const startAt = new Date(input.startAt);
    const now = new Date();

    const candidateEmployeeIds = await this.resolveCandidateEmployeeIds(
      salon.id,
      service.id,
      input.employeeId ?? null,
    );
    if (candidateEmployeeIds.length === 0) {
      throw new BadRequestException('No eligible stylist is available for this service.');
    }

    let chosenEmployeeId: string | null = null;
    for (const employeeId of candidateEmployeeIds) {
      const availabilityInput = await this.loadEmployeeAvailabilityInput(
        employeeId,
        service.id,
        startAt,
      );
      const available = isEmployeeSlotAvailable({
        employee: availabilityInput,
        salonTimezone: salon.timezone,
        now,
        candidateStart: startAt,
        serviceDurationMinutes: service.durationMinutes,
        bufferMinutes: service.bufferMinutes,
        minNoticeMinutes: bookingPolicy.minNoticeMinutes,
        maxAdvanceDays: bookingPolicy.maxAdvanceDays,
      });
      if (available) {
        chosenEmployeeId = employeeId;
        break;
      }
    }
    if (!chosenEmployeeId) {
      throw new ConflictException(SLOT_UNAVAILABLE_MESSAGE);
    }

    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);
    const status = bookingPolicy.autoConfirm ? 'CONFIRMED' : 'PENDING';

    let reservation: ReservationDetail;
    try {
      reservation = await this.prisma.$transaction(async (tx) => {
        // Final re-check, inside the transaction, immediately before the write. This is a fast
        // clean-conflict path — the actual guarantee against a true race is the DB-level
        // `reservation_no_overlap_per_employee` EXCLUDE constraint (ADR-0005), caught below.
        const conflicting = await tx.reservation.count({
          where: {
            employeeId: chosenEmployeeId!,
            status: { in: [...ACTIVE_RESERVATION_STATUSES] },
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
        });
        if (conflicting > 0) {
          throw new ConflictException(SLOT_UNAVAILABLE_MESSAGE);
        }

        const created = await tx.reservation.create({
          data: {
            salonId: salon.id,
            serviceId: service.id,
            employeeId: chosenEmployeeId!,
            customerId,
            status,
            startAt,
            endAt,
            priceAmount: service.priceAmount,
            currency: service.currency,
            customerNote: input.customerNote ?? null,
            idempotencyKey: input.idempotencyKey,
          },
          select: RESERVATION_SELECT,
        });

        await tx.reservationStatusHistory.create({
          data: {
            reservationId: created.id,
            fromStatus: null,
            toStatus: status,
            changedByUserId: customerId,
          },
        });

        await tx.notification.create({
          data: {
            userId: customerId,
            type: status === 'CONFIRMED' ? 'reservation.confirmed' : 'reservation.pending_customer',
            payload: { reservationId: created.id },
          },
        });

        return created;
      });
    } catch (err) {
      if (isExclusionConstraintViolation(err)) {
        throw new ConflictException(SLOT_UNAVAILABLE_MESSAGE);
      }
      if (isIdempotencyKeyConflict(err)) {
        // Two concurrent replays of the same idempotencyKey: the loser lands here instead of
        // the earlier findUnique-based check (which ran before either transaction started, so
        // both requests could pass it). Return the original reservation instead of a raw 500,
        // matching the idempotency guarantee in docs/architecture/reservation-state-machine.md.
        const original = await this.prisma.reservation.findUnique({
          where: { customerId_idempotencyKey: { customerId, idempotencyKey: input.idempotencyKey } },
          select: RESERVATION_SELECT,
        });
        if (original) return original;
      }
      throw err;
    }

    // Audited only on success — a conflict/failure above never reaches here, so this never
    // records a "created" event for an attempt that didn't actually create anything.
    await this.audit.record({
      actorUserId: customerId,
      action: 'reservation.created',
      targetType: 'Reservation',
      targetId: reservation.id,
      salonId: salon.id,
      metadata: { serviceId: service.id, employeeId: chosenEmployeeId, status },
    });

    return reservation;
  }

  /**
   * Manager/admin manual booking (Section 15.4). salonId is the *authorized* SalonContext value
   * from the route guard — never client-chosen — so a manager can never book into another salon.
   * No price/duration/status fields exist on the input schema at all (mass-assignment is
   * impossible, not just rejected). Customer is looked up by email or minimally created (no
   * password set — they'd need a password-reset flow to log in, out of scope here).
   */
  async createManual(
    salonId: string,
    actorUserId: string,
    input: CreateManualReservationInput,
  ): Promise<ReservationDetail> {
    const salon = await this.prisma.salon.findFirst({
      where: { id: salonId, status: 'ACTIVE' },
      select: { id: true, timezone: true },
    });
    if (!salon) {
      throw new NotFoundException('Salon not found.');
    }

    const service = await this.prisma.service.findFirst({
      where: { id: input.serviceId, salonId: salon.id, isActive: true },
      select: { id: true, durationMinutes: true, bufferMinutes: true, priceAmount: true, currency: true },
    });
    if (!service) {
      throw new BadRequestException('This service is not available at this salon.');
    }

    const bookingPolicy = await this.prisma.bookingPolicy.findUnique({ where: { salonId: salon.id } });
    if (!bookingPolicy) {
      throw new BadRequestException('This salon is not configured for booking.');
    }

    // customerFullName is required by the schema unconditionally (even for an existing customer)
    // so this lookup never has to branch its error on whether the account exists — that branch
    // was a cross-tenant account-existence oracle. An existing customer's name is left untouched.
    let customer = await this.prisma.user.findUnique({ where: { email: input.customerEmail } });
    if (!customer) {
      // Unusable random hash — this account has no password until the customer resets one.
      customer = await this.prisma.user.create({
        data: {
          email: input.customerEmail,
          passwordHash: `unset:${crypto.randomUUID()}`,
          fullName: input.customerFullName,
        },
      });
    }

    const startAt = new Date(input.startAt);
    const now = new Date();

    const candidateEmployeeIds = await this.resolveCandidateEmployeeIds(
      salon.id,
      service.id,
      input.employeeId ?? null,
    );
    if (candidateEmployeeIds.length === 0) {
      throw new BadRequestException('No eligible stylist is available for this service.');
    }

    let chosenEmployeeId: string | null = null;
    for (const employeeId of candidateEmployeeIds) {
      const availabilityInput = await this.loadEmployeeAvailabilityInput(employeeId, service.id, startAt);
      const available = isEmployeeSlotAvailable({
        employee: availabilityInput,
        salonTimezone: salon.timezone,
        now,
        candidateStart: startAt,
        serviceDurationMinutes: service.durationMinutes,
        bufferMinutes: service.bufferMinutes,
        minNoticeMinutes: bookingPolicy.minNoticeMinutes,
        maxAdvanceDays: bookingPolicy.maxAdvanceDays,
      });
      if (available) {
        chosenEmployeeId = employeeId;
        break;
      }
    }
    if (!chosenEmployeeId) {
      throw new ConflictException(SLOT_UNAVAILABLE_MESSAGE);
    }

    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);
    const status = bookingPolicy.autoConfirm ? 'CONFIRMED' : 'PENDING';
    const customerId = customer.id;

    let reservation: ReservationDetail;
    try {
      reservation = await this.prisma.$transaction(async (tx) => {
        const conflicting = await tx.reservation.count({
          where: {
            employeeId: chosenEmployeeId!,
            status: { in: [...ACTIVE_RESERVATION_STATUSES] },
            startAt: { lt: endAt },
            endAt: { gt: startAt },
          },
        });
        if (conflicting > 0) {
          throw new ConflictException(SLOT_UNAVAILABLE_MESSAGE);
        }

        const created = await tx.reservation.create({
          data: {
            salonId: salon.id,
            serviceId: service.id,
            employeeId: chosenEmployeeId!,
            customerId,
            status,
            startAt,
            endAt,
            priceAmount: service.priceAmount,
            currency: service.currency,
            customerNote: input.customerNote ?? null,
            // SEC-002: snapshot the manager-supplied name so the staff detail never leaks the
            // global User.fullName of a pre-existing account from another salon.
            guestName: input.customerFullName,
          },
          select: RESERVATION_SELECT,
        });

        await tx.reservationStatusHistory.create({
          data: {
            reservationId: created.id,
            fromStatus: null,
            toStatus: status,
            changedByUserId: actorUserId,
          },
        });

        await tx.notification.create({
          data: {
            userId: customerId,
            type: status === 'CONFIRMED' ? 'reservation.confirmed' : 'reservation.pending_customer',
            payload: { reservationId: created.id },
          },
        });

        return created;
      });
    } catch (err) {
      if (isExclusionConstraintViolation(err)) {
        throw new ConflictException(SLOT_UNAVAILABLE_MESSAGE);
      }
      throw err;
    }

    await this.audit.record({
      actorUserId,
      action: 'reservation.created',
      targetType: 'Reservation',
      targetId: reservation.id,
      salonId: salon.id,
      metadata: { serviceId: service.id, employeeId: chosenEmployeeId, status, source: 'MANUAL', customerId },
    });

    return reservation;
  }

  private async resolveCandidateEmployeeIds(
    salonId: string,
    serviceId: string,
    requestedEmployeeId: string | null,
  ): Promise<string[]> {
    if (requestedEmployeeId) {
      const employee = await this.prisma.employeeProfile.findFirst({
        where: {
          id: requestedEmployeeId,
          salonId,
          isActive: true,
          eligibleServices: { some: { serviceId } },
        },
        select: { id: true },
      });
      return employee ? [employee.id] : [];
    }

    const eligible = await this.prisma.employeeProfile.findMany({
      where: { salonId, isActive: true, eligibleServices: { some: { serviceId } } },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    return eligible.map((e) => e.id);
  }

  private async loadEmployeeAvailabilityInput(
    employeeId: string,
    serviceId: string,
    aroundInstant: Date,
  ): Promise<EmployeeAvailabilityInput> {
    // A generous window around the requested instant is enough for a single-slot re-check (unlike
    // the full listing engine, we don't need the employee's entire time-off history).
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

function isExclusionConstraintViolation(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('reservation_no_overlap_per_employee');
}

function isIdempotencyKeyConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002' &&
    Array.isArray(err.meta?.target) &&
    (err.meta.target as string[]).includes('idempotencyKey')
  );
}
