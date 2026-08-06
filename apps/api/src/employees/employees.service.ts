import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateEmployeeInput,
  ListEmployeesQuery,
  UpdateEmployeeInput,
} from '@salonomia/validation';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export interface EmployeeListItem {
  id: string;
  fullName: string;
  bio: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface EmployeeDetail extends EmployeeListItem {
  updatedAt: Date;
}

const SELECT = {
  id: true,
  fullName: true,
  bio: true,
  photoUrl: true,
  isActive: true,
  createdAt: true,
} as const;
const DETAIL_SELECT = { ...SELECT, updatedAt: true } as const;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    salonId: string,
    query: ListEmployeesQuery,
  ): Promise<{ items: EmployeeListItem[]; total: number; page: number; pageSize: number }> {
    // salonId here is the authorized value RolesGuard resolved (SalonContext), never a raw
    // client-supplied value trusted without a DB-backed membership/superadmin check.
    const where = {
      salonId,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? { fullName: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.employeeProfile.findMany({
        where,
        select: SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.employeeProfile.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async detail(salonId: string, employeeId: string): Promise<EmployeeDetail> {
    // salonId is included in the query itself — an employee ID that belongs to a different salon
    // returns nothing here rather than being fetched and checked afterward (no cross-salon leakage).
    const employee = await this.prisma.employeeProfile.findFirst({
      where: { id: employeeId, salonId },
      select: DETAIL_SELECT,
    });

    if (!employee) {
      throw new NotFoundException();
    }

    return employee;
  }

  async create(
    salonId: string,
    input: CreateEmployeeInput,
    actorUserId: string,
  ): Promise<EmployeeDetail> {
    const employee = await this.prisma.employeeProfile.create({
      data: { salonId, fullName: input.fullName, bio: input.bio },
      select: DETAIL_SELECT,
    });

    await this.audit.record({
      actorUserId,
      action: 'employee.created',
      targetType: 'EmployeeProfile',
      targetId: employee.id,
      salonId,
    });

    return employee;
  }

  async update(
    salonId: string,
    employeeId: string,
    input: UpdateEmployeeInput,
    actorUserId: string,
  ): Promise<EmployeeDetail> {
    const current = await this.prisma.employeeProfile.findFirst({
      where: { id: employeeId, salonId },
    });
    if (!current) {
      throw new NotFoundException();
    }

    if (input.expectedUpdatedAt) {
      const expected = new Date(input.expectedUpdatedAt).getTime();
      if (expected !== current.updatedAt.getTime()) {
        throw new ConflictException(
          'This employee was changed by someone else. Reload and try again.',
        );
      }
    }

    // Explicit allowlist built field-by-field — never a spread of the raw body.
    const data: Record<string, unknown> = {};
    const editableFields = ['fullName', 'bio'] as const;
    for (const field of editableFields) {
      if (field in input) data[field] = input[field];
    }

    const updated = await this.prisma.employeeProfile.update({
      // salonId in the where clause makes this update tenant-scoped, not just existence-scoped —
      // even though `current` above already proved ownership, repeating the scope here means the
      // write itself can never touch another salon's row even under a future refactor bug.
      where: { id: employeeId, salonId },
      data,
      select: DETAIL_SELECT,
    });

    await this.audit.record({
      actorUserId,
      action: 'employee.updated',
      targetType: 'EmployeeProfile',
      targetId: employeeId,
      salonId,
      metadata: { changedFields: Object.keys(data) },
    });

    return updated;
  }

  async setActive(
    salonId: string,
    employeeId: string,
    isActive: boolean,
    actorUserId: string,
  ): Promise<EmployeeDetail> {
    const current = await this.prisma.employeeProfile.findFirst({
      where: { id: employeeId, salonId },
    });
    if (!current) {
      throw new NotFoundException();
    }

    const updated = await this.prisma.employeeProfile.update({
      where: { id: employeeId, salonId },
      data: { isActive },
      select: DETAIL_SELECT,
    });

    await this.audit.record({
      actorUserId,
      action: isActive ? 'employee.activated' : 'employee.deactivated',
      targetType: 'EmployeeProfile',
      targetId: employeeId,
      salonId,
    });

    return updated;
  }
}
