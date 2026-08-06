import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateServiceCategoryInput,
  ReorderServiceCategoriesInput,
  UpdateServiceCategoryInput,
} from '@salonomia/validation';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export interface ServiceCategoryDetail {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ServiceCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(salonId: string): Promise<ServiceCategoryDetail[]> {
    // salonId here is the authorized value RolesGuard resolved (SalonContext), never a raw
    // client-supplied value trusted without a DB-backed membership/superadmin check.
    return this.prisma.serviceCategory.findMany({
      where: { salonId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async detail(salonId: string, categoryId: string): Promise<ServiceCategoryDetail> {
    // salonId is included in the query itself — a category ID from a different salon returns
    // nothing here rather than being fetched and checked afterward (no cross-salon leakage).
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id: categoryId, salonId },
    });
    if (!category) {
      throw new NotFoundException();
    }
    return category;
  }

  private async assertNameAvailable(
    salonId: string,
    name: string,
    excludeCategoryId?: string,
  ): Promise<void> {
    const existing = await this.prisma.serviceCategory.findFirst({
      where: { salonId, name, ...(excludeCategoryId ? { id: { not: excludeCategoryId } } : {}) },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('A category with this name already exists.');
    }
  }

  async create(
    salonId: string,
    input: CreateServiceCategoryInput,
    actorUserId: string,
  ): Promise<ServiceCategoryDetail> {
    await this.assertNameAvailable(salonId, input.name);

    const last = await this.prisma.serviceCategory.findFirst({
      where: { salonId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const category = await this.prisma.serviceCategory.create({
      data: { salonId, name: input.name, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });

    await this.audit.record({
      actorUserId,
      action: 'service_category.created',
      targetType: 'ServiceCategory',
      targetId: category.id,
      salonId,
    });

    return category;
  }

  async update(
    salonId: string,
    categoryId: string,
    input: UpdateServiceCategoryInput,
    actorUserId: string,
  ): Promise<ServiceCategoryDetail> {
    const current = await this.prisma.serviceCategory.findFirst({
      where: { id: categoryId, salonId },
    });
    if (!current) {
      throw new NotFoundException();
    }

    if (input.expectedUpdatedAt) {
      const expected = new Date(input.expectedUpdatedAt).getTime();
      if (expected !== current.updatedAt.getTime()) {
        throw new ConflictException(
          'This category was changed by someone else. Reload and try again.',
        );
      }
    }

    if (input.name && input.name !== current.name) {
      await this.assertNameAvailable(salonId, input.name, categoryId);
    }

    const data: Record<string, unknown> = {};
    const editableFields = ['name'] as const;
    for (const field of editableFields) {
      if (field in input) data[field] = input[field];
    }

    const updated = await this.prisma.serviceCategory.update({
      // salonId in the where clause makes this update tenant-scoped, not just existence-scoped —
      // even though `current` above already proved ownership, repeating the scope here means the
      // write itself can never touch another salon's row even under a future refactor bug.
      where: { id: categoryId, salonId },
      data,
    });

    await this.audit.record({
      actorUserId,
      action: 'service_category.updated',
      targetType: 'ServiceCategory',
      targetId: categoryId,
      salonId,
      metadata: { changedFields: Object.keys(data) },
    });

    return updated;
  }

  async setActive(
    salonId: string,
    categoryId: string,
    isActive: boolean,
    actorUserId: string,
  ): Promise<ServiceCategoryDetail> {
    const current = await this.prisma.serviceCategory.findFirst({
      where: { id: categoryId, salonId },
    });
    if (!current) {
      throw new NotFoundException();
    }

    const updated = await this.prisma.serviceCategory.update({
      where: { id: categoryId, salonId },
      data: { isActive },
    });

    await this.audit.record({
      actorUserId,
      action: isActive ? 'service_category.activated' : 'service_category.deactivated',
      targetType: 'ServiceCategory',
      targetId: categoryId,
      salonId,
    });

    return updated;
  }

  async reorder(
    salonId: string,
    input: ReorderServiceCategoriesInput,
    actorUserId: string,
  ): Promise<void> {
    const existing = await this.prisma.serviceCategory.findMany({
      where: { salonId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));
    const requestedIds = new Set(input.categoryIds);

    const sameSet =
      existingIds.size === requestedIds.size &&
      [...existingIds].every((id) => requestedIds.has(id));
    if (!sameSet) {
      throw new BadRequestException('categoryIds must be exactly the salon’s current categories.');
    }

    await this.prisma.$transaction(
      input.categoryIds.map((id, index) =>
        this.prisma.serviceCategory.update({
          where: { id, salonId },
          data: { sortOrder: index },
        }),
      ),
    );

    await this.audit.record({
      actorUserId,
      action: 'service_category.reordered',
      targetType: 'Salon',
      targetId: salonId,
      salonId,
      metadata: { categoryIds: input.categoryIds },
    });
  }
}
