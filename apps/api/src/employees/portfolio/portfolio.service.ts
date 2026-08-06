import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { detectImageMime, type StorageAdapter, type UploadTarget } from '@salonomia/storage';
import {
  MAX_PORTFOLIO_UPLOAD_BYTES,
  type ConfirmPortfolioItemInput,
  type ReorderPortfolioInput,
  type RequestPortfolioUploadInput,
  type UpdatePortfolioItemInput,
} from '@salonomia/validation';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_ADAPTER } from '../../storage/storage.tokens';

export interface PortfolioItemDetail {
  id: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
  createdAt: Date;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
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

  private async toDetail(item: {
    id: string;
    imageUrl: string;
    caption: string | null;
    sortOrder: number;
    createdAt: Date;
  }): Promise<PortfolioItemDetail> {
    // `imageUrl` stores the storage object key, not a persisted URL — a fresh (possibly signed,
    // short-lived) URL is generated on every read so nothing long-lived leaks. See ADR-0008.
    return { ...item, imageUrl: await this.storage.getObjectUrl(item.imageUrl) };
  }

  async requestUpload(
    salonId: string,
    employeeId: string,
    input: RequestPortfolioUploadInput,
  ): Promise<UploadTarget & { objectKey: string }> {
    await this.assertEmployeeInSalon(salonId, employeeId);

    const extension = EXTENSION_BY_MIME[input.mimeType];
    const objectKey = `employees/${employeeId}/${randomUUID()}.${extension}`;
    const target = await this.storage.createUploadTarget(
      objectKey,
      input.mimeType,
      input.sizeBytes,
    );
    return { ...target, objectKey };
  }

  async confirm(
    salonId: string,
    employeeId: string,
    input: ConfirmPortfolioItemInput,
    actorUserId: string,
  ): Promise<PortfolioItemDetail> {
    await this.assertEmployeeInSalon(salonId, employeeId);

    // The objectKey must actually belong to this employee's upload namespace — otherwise a
    // SALON_ADMIN of one salon could confirm an objectKey they saw elsewhere as their own item.
    if (!input.objectKey.startsWith(`employees/${employeeId}/`)) {
      throw new BadRequestException('This upload does not belong to this employee.');
    }

    const stat = await this.storage.statObject(input.objectKey);
    if (!stat) {
      throw new BadRequestException('Upload not found. It may not have completed.');
    }
    if (stat.sizeBytes > MAX_PORTFOLIO_UPLOAD_BYTES) {
      await this.storage.deleteObject(input.objectKey);
      throw new BadRequestException('Uploaded file exceeds the allowed size limit.');
    }

    const head = await this.storage.readObjectHead(input.objectKey, 12);
    if (!head || !detectImageMime(head)) {
      await this.storage.deleteObject(input.objectKey);
      throw new BadRequestException('Uploaded file is not a recognized image format.');
    }

    const lastItem = await this.prisma.employeePortfolioItem.findFirst({
      where: { employeeId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const item = await this.prisma.employeePortfolioItem.create({
      data: {
        employeeId,
        imageUrl: input.objectKey,
        caption: input.caption ?? null,
        sortOrder: (lastItem?.sortOrder ?? -1) + 1,
      },
    });

    await this.audit.record({
      actorUserId,
      action: 'employee.portfolio_item.created',
      targetType: 'EmployeePortfolioItem',
      targetId: item.id,
      salonId,
    });

    return this.toDetail(item);
  }

  async list(salonId: string, employeeId: string): Promise<PortfolioItemDetail[]> {
    await this.assertEmployeeInSalon(salonId, employeeId);

    const items = await this.prisma.employeePortfolioItem.findMany({
      where: { employeeId },
      orderBy: { sortOrder: 'asc' },
    });

    return Promise.all(items.map((item) => this.toDetail(item)));
  }

  async update(
    salonId: string,
    employeeId: string,
    itemId: string,
    input: UpdatePortfolioItemInput,
    actorUserId: string,
  ): Promise<PortfolioItemDetail> {
    await this.assertEmployeeInSalon(salonId, employeeId);

    const current = await this.prisma.employeePortfolioItem.findFirst({
      where: { id: itemId, employeeId },
    });
    if (!current) {
      throw new NotFoundException();
    }

    const updated = await this.prisma.employeePortfolioItem.update({
      where: { id: itemId, employeeId },
      data: { caption: input.caption },
    });

    await this.audit.record({
      actorUserId,
      action: 'employee.portfolio_item.updated',
      targetType: 'EmployeePortfolioItem',
      targetId: itemId,
      salonId,
    });

    return this.toDetail(updated);
  }

  async reorder(
    salonId: string,
    employeeId: string,
    input: ReorderPortfolioInput,
    actorUserId: string,
  ): Promise<void> {
    await this.assertEmployeeInSalon(salonId, employeeId);

    const existing = await this.prisma.employeePortfolioItem.findMany({
      where: { employeeId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));
    const requestedIds = new Set(input.itemIds);

    const sameSet =
      existingIds.size === requestedIds.size &&
      [...existingIds].every((id) => requestedIds.has(id));
    if (!sameSet) {
      throw new BadRequestException(
        'itemIds must be exactly the employee’s current portfolio items.',
      );
    }

    await this.prisma.$transaction(
      input.itemIds.map((id: string, index: number) =>
        this.prisma.employeePortfolioItem.update({
          where: { id, employeeId },
          data: { sortOrder: index },
        }),
      ),
    );

    await this.audit.record({
      actorUserId,
      action: 'employee.portfolio_item.reordered',
      targetType: 'EmployeeProfile',
      targetId: employeeId,
      salonId,
      metadata: { itemIds: input.itemIds },
    });
  }

  async remove(
    salonId: string,
    employeeId: string,
    itemId: string,
    actorUserId: string,
  ): Promise<void> {
    await this.assertEmployeeInSalon(salonId, employeeId);

    const current = await this.prisma.employeePortfolioItem.findFirst({
      where: { id: itemId, employeeId },
    });
    if (!current) {
      throw new NotFoundException();
    }

    await this.prisma.employeePortfolioItem.delete({ where: { id: itemId, employeeId } });

    // Best-effort: a storage-delete failure shouldn't block the item disappearing for users —
    // the DB row is the source of truth for what's shown, and this is an orphaned-object cleanup
    // concern rather than a correctness one.
    await this.storage.deleteObject(current.imageUrl).catch(() => undefined);

    await this.audit.record({
      actorUserId,
      action: 'employee.portfolio_item.deleted',
      targetType: 'EmployeePortfolioItem',
      targetId: itemId,
      salonId,
    });
  }
}
