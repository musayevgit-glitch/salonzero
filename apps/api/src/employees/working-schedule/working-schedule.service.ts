import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateWorkingScheduleInput } from '@salonomia/validation';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface WorkingScheduleEntry {
  id: string;
  weekday: number;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
}

@Injectable()
export class WorkingScheduleService {
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
      throw new BadRequestException('Cannot manage the schedule of an inactive employee.');
    }
  }

  async list(salonId: string, employeeId: string): Promise<WorkingScheduleEntry[]> {
    // salonId here is the authorized value RolesGuard resolved (SalonContext), never a raw
    // client-supplied value trusted without a DB-backed membership/superadmin check.
    const employee = await this.prisma.employeeProfile.findFirst({
      where: { id: employeeId, salonId },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException();
    }

    return this.prisma.workingSchedule.findMany({
      where: { employeeId },
      orderBy: [{ weekday: 'asc' }, { startMinuteOfDay: 'asc' }],
    });
  }

  async create(
    salonId: string,
    employeeId: string,
    input: CreateWorkingScheduleInput,
    actorUserId: string,
  ): Promise<WorkingScheduleEntry> {
    await this.assertActiveEmployeeInSalon(salonId, employeeId);

    const sameDay = await this.prisma.workingSchedule.findMany({
      where: { employeeId, weekday: input.weekday },
    });
    const overlaps = sameDay.some(
      (existing) =>
        input.startMinuteOfDay < existing.endMinuteOfDay &&
        existing.startMinuteOfDay < input.endMinuteOfDay,
    );
    if (overlaps) {
      throw new BadRequestException(
        'This interval overlaps an existing working-schedule entry for that day.',
      );
    }

    const entry = await this.prisma.workingSchedule.create({
      data: {
        employeeId,
        weekday: input.weekday,
        startMinuteOfDay: input.startMinuteOfDay,
        endMinuteOfDay: input.endMinuteOfDay,
      },
    });

    await this.audit.record({
      actorUserId,
      action: 'working_schedule.created',
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
    scheduleId: string,
    actorUserId: string,
  ): Promise<void> {
    const employee = await this.prisma.employeeProfile.findFirst({
      where: { id: employeeId, salonId },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException();
    }

    const entry = await this.prisma.workingSchedule.findFirst({
      where: { id: scheduleId, employeeId },
    });
    if (!entry) {
      throw new NotFoundException();
    }

    await this.prisma.workingSchedule.delete({ where: { id: scheduleId, employeeId } });

    await this.audit.record({
      actorUserId,
      action: 'working_schedule.deleted',
      targetType: 'EmployeeProfile',
      targetId: employeeId,
      salonId,
      metadata: { weekday: entry.weekday },
    });
  }
}
