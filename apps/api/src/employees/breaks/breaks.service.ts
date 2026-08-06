import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateBreakInput } from '@salonomia/validation';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface BreakEntry {
  id: string;
  weekday: number;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
}

@Injectable()
export class BreaksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async assertActiveEmployeeInSalon(salonId: string, employeeId: string): Promise<void> {
    const employee = await this.prisma.employeeProfile.findFirst({
      where: { id: employeeId, salonId },
      select: { id: true, isActive: true },
    });
    if (!employee) {
      throw new NotFoundException();
    }
    if (!employee.isActive) {
      throw new BadRequestException('Cannot manage breaks for an inactive employee.');
    }
  }

  async list(salonId: string, employeeId: string): Promise<BreakEntry[]> {
    // salonId here is the authorized value RolesGuard resolved (SalonContext), never a raw
    // client-supplied value trusted without a DB-backed membership/superadmin check.
    const employee = await this.prisma.employeeProfile.findFirst({
      where: { id: employeeId, salonId },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException();
    }

    return this.prisma.break.findMany({
      where: { employeeId },
      orderBy: [{ weekday: 'asc' }, { startMinuteOfDay: 'asc' }],
    });
  }

  async create(
    salonId: string,
    employeeId: string,
    input: CreateBreakInput,
    actorUserId: string,
  ): Promise<BreakEntry> {
    await this.assertActiveEmployeeInSalon(salonId, employeeId);

    // A break must fit entirely within one of the employee's working-schedule blocks for that
    // weekday — it cannot extend beyond hours the employee doesn't work at all.
    const sameDaySchedule = await this.prisma.workingSchedule.findMany({
      where: { employeeId, weekday: input.weekday },
    });
    const fitsWithinSchedule = sameDaySchedule.some(
      (ws) =>
        input.startMinuteOfDay >= ws.startMinuteOfDay && input.endMinuteOfDay <= ws.endMinuteOfDay,
    );
    if (!fitsWithinSchedule) {
      throw new BadRequestException(
        'This break must fit entirely within an existing working-schedule block for that day.',
      );
    }

    const sameDayBreaks = await this.prisma.break.findMany({
      where: { employeeId, weekday: input.weekday },
    });
    const overlapsBreak = sameDayBreaks.some(
      (existing) =>
        input.startMinuteOfDay < existing.endMinuteOfDay &&
        existing.startMinuteOfDay < input.endMinuteOfDay,
    );
    if (overlapsBreak) {
      throw new BadRequestException('This break overlaps an existing break for that day.');
    }

    const entry = await this.prisma.break.create({
      data: {
        employeeId,
        weekday: input.weekday,
        startMinuteOfDay: input.startMinuteOfDay,
        endMinuteOfDay: input.endMinuteOfDay,
      },
    });

    await this.audit.record({
      actorUserId,
      action: 'break.created',
      targetType: 'EmployeeProfile',
      targetId: employeeId,
      salonId,
      metadata: {
        weekday: input.weekday,
        startMinuteOfDay: input.startMinuteOfDay,
        endMinuteOfDay: input.endMinuteOfDay,
      },
    });

    return entry;
  }

  async remove(
    salonId: string,
    employeeId: string,
    breakId: string,
    actorUserId: string,
  ): Promise<void> {
    const employee = await this.prisma.employeeProfile.findFirst({
      where: { id: employeeId, salonId },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException();
    }

    const entry = await this.prisma.break.findFirst({
      where: { id: breakId, employeeId },
    });
    if (!entry) {
      throw new NotFoundException();
    }

    await this.prisma.break.delete({ where: { id: breakId, employeeId } });

    await this.audit.record({
      actorUserId,
      action: 'break.deleted',
      targetType: 'EmployeeProfile',
      targetId: employeeId,
      salonId,
      metadata: { weekday: entry.weekday },
    });
  }
}
