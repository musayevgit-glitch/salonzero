import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateTimeOffInput } from '@salonomia/validation';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface TimeOffEntry {
  id: string;
  startAt: Date;
  endAt: Date;
  reason: string | null;
}

export interface ConflictingReservation {
  id: string;
  startAt: Date;
  endAt: Date;
  status: string;
}

// Reservations that still represent a real future commitment — REJECTED/CANCELLED_*/NO_SHOW/
// COMPLETED are terminal and can never conflict with a new time-off period.
const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN'] as const;

@Injectable()
export class TimeOffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async assertEmployeeInSalon(salonId: string, employeeId: string): Promise<void> {
    const employee = await this.prisma.employeeProfile.findFirst({
      where: { id: employeeId, salonId },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException();
    }
  }

  async list(salonId: string, employeeId: string): Promise<TimeOffEntry[]> {
    // salonId here is the authorized value RolesGuard resolved (SalonContext), never a raw
    // client-supplied value trusted without a DB-backed membership/superadmin check.
    await this.assertEmployeeInSalon(salonId, employeeId);

    return this.prisma.timeOff.findMany({
      where: { employeeId },
      orderBy: { startAt: 'asc' },
      select: { id: true, startAt: true, endAt: true, reason: true },
    });
  }

  async create(
    salonId: string,
    employeeId: string,
    input: CreateTimeOffInput,
    actorUserId: string,
  ): Promise<TimeOffEntry> {
    await this.assertEmployeeInSalon(salonId, employeeId);

    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);

    const overlappingTimeOff = await this.prisma.timeOff.findFirst({
      where: { employeeId, startAt: { lt: endAt }, endAt: { gt: startAt } },
    });
    if (overlappingTimeOff) {
      throw new ConflictException('This overlaps an existing time-off period for this employee.');
    }

    // Do not silently cancel reservations: if this period overlaps existing active reservations
    // and the caller hasn't explicitly acknowledged that, surface them instead of creating the
    // time-off period at all — the admin must resubmit with acknowledgeConflicts to proceed, and
    // even then the reservations themselves are left untouched (cancelling them, if desired, is a
    // separate explicit action on the reservation itself).
    if (!input.acknowledgeConflicts) {
      const conflicts = await this.prisma.reservation.findMany({
        where: {
          salonId,
          employeeId,
          status: { in: [...ACTIVE_RESERVATION_STATUSES] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true, startAt: true, endAt: true, status: true },
        orderBy: { startAt: 'asc' },
      });

      if (conflicts.length > 0) {
        throw new ConflictException({
          message:
            'This time-off period overlaps existing reservations. Review them and resubmit with acknowledgeConflicts to proceed.',
          conflicts: conflicts satisfies ConflictingReservation[],
        });
      }
    }

    const entry = await this.prisma.timeOff.create({
      data: { employeeId, startAt, endAt, reason: input.reason ?? null },
      select: { id: true, startAt: true, endAt: true, reason: true },
    });

    await this.audit.record({
      actorUserId,
      action: 'time_off.created',
      targetType: 'EmployeeProfile',
      targetId: employeeId,
      salonId,
      metadata: {
        startAt: entry.startAt.toISOString(),
        endAt: entry.endAt.toISOString(),
        acknowledgedConflicts: input.acknowledgeConflicts ?? false,
      },
    });

    return entry;
  }

  async remove(
    salonId: string,
    employeeId: string,
    timeOffId: string,
    actorUserId: string,
  ): Promise<void> {
    await this.assertEmployeeInSalon(salonId, employeeId);

    const entry = await this.prisma.timeOff.findFirst({
      where: { id: timeOffId, employeeId },
    });
    if (!entry) {
      throw new NotFoundException();
    }

    await this.prisma.timeOff.delete({ where: { id: timeOffId, employeeId } });

    await this.audit.record({
      actorUserId,
      action: 'time_off.deleted',
      targetType: 'EmployeeProfile',
      targetId: employeeId,
      salonId,
      metadata: { startAt: entry.startAt.toISOString(), endAt: entry.endAt.toISOString() },
    });
  }
}
