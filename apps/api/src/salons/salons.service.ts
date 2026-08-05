import { Injectable, NotFoundException } from '@nestjs/common';
import type { ListSalonsQuery } from '@salonomia/validation';
import { PrismaService } from '../prisma/prisma.service';

export interface SalonListItem {
  id: string;
  slug: string;
  name: string;
  status: string;
  city: string | null;
  timezone: string;
  createdAt: Date;
}

export interface SalonDetail extends SalonListItem {
  description: string | null;
  addressLine: string | null;
  phone: string | null;
  email: string | null;
  subdomain: string | null;
  customDomain: string | null;
  genderFocus: string | null;
  activeMembershipCount: number;
}

@Injectable()
export class SalonsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ListSalonsQuery,
  ): Promise<{ items: SalonListItem[]; total: number; page: number; pageSize: number }> {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { slug: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.salon.findMany({
        where,
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
          city: true,
          timezone: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.salon.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async detail(salonId: string): Promise<SalonDetail> {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        city: true,
        timezone: true,
        createdAt: true,
        description: true,
        addressLine: true,
        phone: true,
        email: true,
        subdomain: true,
        customDomain: true,
        genderFocus: true,
        _count: { select: { memberships: { where: { status: 'ACTIVE' } } } },
      },
    });

    // Same 404 whether the ID is malformed, doesn't exist, or (in later phases) belongs to another
    // tenant the caller can't see — no existence leakage (docs/security/authorization.md).
    if (!salon) {
      throw new NotFoundException();
    }

    const { _count, ...rest } = salon;
    return { ...rest, activeMembershipCount: _count.memberships };
  }
}
