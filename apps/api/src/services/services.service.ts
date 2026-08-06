import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateServiceInput,
  ListServicesQuery,
  UpdateServiceInput,
} from '@salonomia/validation';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export interface ServiceListItem {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
  createdAt: Date;
}

export interface ServiceDetail extends ServiceListItem {
  updatedAt: Date;
}

const SELECT = {
  id: true,
  categoryId: true,
  name: true,
  description: true,
  priceAmount: true,
  currency: true,
  durationMinutes: true,
  bufferMinutes: true,
  isActive: true,
  createdAt: true,
} as const;
const DETAIL_SELECT = { ...SELECT, updatedAt: true } as const;

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async assertCategoryBelongsToSalon(salonId: string, categoryId: string): Promise<void> {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id: categoryId, salonId },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException('categoryId must reference a category in this salon.');
    }
  }

  async list(
    salonId: string,
    query: ListServicesQuery,
  ): Promise<{ items: ServiceListItem[]; total: number; page: number; pageSize: number }> {
    // salonId here is the authorized value RolesGuard resolved (SalonContext), never a raw
    // client-supplied value trusted without a DB-backed membership/superadmin check.
    const where = {
      salonId,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({
        where,
        select: SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.service.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async detail(salonId: string, serviceId: string): Promise<ServiceDetail> {
    // salonId is included in the query itself — a service ID from a different salon returns
    // nothing here rather than being fetched and checked afterward (no cross-salon leakage).
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, salonId },
      select: DETAIL_SELECT,
    });
    if (!service) {
      throw new NotFoundException();
    }
    return service;
  }

  async create(
    salonId: string,
    input: CreateServiceInput,
    actorUserId: string,
  ): Promise<ServiceDetail> {
    if (input.categoryId) {
      await this.assertCategoryBelongsToSalon(salonId, input.categoryId);
    }

    const service = await this.prisma.service.create({
      data: {
        salonId,
        categoryId: input.categoryId ?? null,
        name: input.name,
        description: input.description ?? null,
        priceAmount: input.priceAmount,
        currency: input.currency,
        durationMinutes: input.durationMinutes,
        bufferMinutes: input.bufferMinutes,
      },
      select: DETAIL_SELECT,
    });

    await this.audit.record({
      actorUserId,
      action: 'service.created',
      targetType: 'Service',
      targetId: service.id,
      salonId,
    });

    return service;
  }

  async update(
    salonId: string,
    serviceId: string,
    input: UpdateServiceInput,
    actorUserId: string,
  ): Promise<ServiceDetail> {
    const current = await this.prisma.service.findFirst({
      where: { id: serviceId, salonId },
    });
    if (!current) {
      throw new NotFoundException();
    }

    if (input.expectedUpdatedAt) {
      const expected = new Date(input.expectedUpdatedAt).getTime();
      if (expected !== current.updatedAt.getTime()) {
        throw new ConflictException(
          'This service was changed by someone else. Reload and try again.',
        );
      }
    }

    if (input.categoryId) {
      await this.assertCategoryBelongsToSalon(salonId, input.categoryId);
    }

    // Explicit allowlist built field-by-field — never a spread of the raw body.
    const data: Record<string, unknown> = {};
    const editableFields = [
      'categoryId',
      'name',
      'description',
      'priceAmount',
      'currency',
      'durationMinutes',
      'bufferMinutes',
    ] as const;
    for (const field of editableFields) {
      if (field in input) data[field] = input[field];
    }

    const updated = await this.prisma.service.update({
      // salonId in the where clause makes this update tenant-scoped, not just existence-scoped —
      // even though `current` above already proved ownership, repeating the scope here means the
      // write itself can never touch another salon's row even under a future refactor bug.
      where: { id: serviceId, salonId },
      data,
      select: DETAIL_SELECT,
    });

    await this.audit.record({
      actorUserId,
      action: 'service.updated',
      targetType: 'Service',
      targetId: serviceId,
      salonId,
      metadata: { changedFields: Object.keys(data) },
    });

    return updated;
  }

  async setActive(
    salonId: string,
    serviceId: string,
    isActive: boolean,
    actorUserId: string,
  ): Promise<ServiceDetail> {
    const current = await this.prisma.service.findFirst({
      where: { id: serviceId, salonId },
    });
    if (!current) {
      throw new NotFoundException();
    }

    const updated = await this.prisma.service.update({
      where: { id: serviceId, salonId },
      data: { isActive },
      select: DETAIL_SELECT,
    });

    await this.audit.record({
      actorUserId,
      action: isActive ? 'service.activated' : 'service.deactivated',
      targetType: 'Service',
      targetId: serviceId,
      salonId,
    });

    return updated;
  }
}
