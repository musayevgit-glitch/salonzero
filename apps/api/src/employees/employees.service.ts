import { Injectable, NotFoundException } from '@nestjs/common';
import type { ListEmployeesQuery } from '@salonomia/validation';
import { PrismaService } from '../prisma/prisma.service';

export interface EmployeeListItem {
  id: string;
  fullName: string;
  bio: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

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
        select: {
          id: true,
          fullName: true,
          bio: true,
          photoUrl: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.employeeProfile.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async detail(salonId: string, employeeId: string): Promise<EmployeeListItem> {
    // salonId is included in the query itself — an employee ID that belongs to a different salon
    // returns nothing here rather than being fetched and checked afterward (no cross-salon leakage).
    const employee = await this.prisma.employeeProfile.findFirst({
      where: { id: employeeId, salonId },
      select: {
        id: true,
        fullName: true,
        bio: true,
        photoUrl: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!employee) {
      throw new NotFoundException();
    }

    return employee;
  }
}
