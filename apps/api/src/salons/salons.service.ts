import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateSalonInput,
  ListSalonsQuery,
  SalonLifecycleActionInput,
  UpdateSalonInput,
} from '@salonomia/validation';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — matches docs/security/authentication.md

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// ICU's canonical list uses 'Etc/UTC', not the (equally standard, far more commonly typed) 'UTC' —
// add it explicitly rather than rejecting a perfectly valid identifier real users will enter.
const SUPPORTED_TIMEZONES = new Set([...Intl.supportedValuesOf('timeZone'), 'UTC']);

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
  updatedAt: Date;
}

const DETAIL_SELECT = {
  id: true,
  slug: true,
  name: true,
  status: true,
  city: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
  description: true,
  addressLine: true,
  phone: true,
  email: true,
  subdomain: true,
  customDomain: true,
  genderFocus: true,
} as const;

export interface CreateSalonResult {
  salon: SalonListItem;
  invitation: {
    email: string;
    expiresAt: Date;
    // Raw token, returned exactly once — no notification provider exists yet
    // (docs/security/authentication.md), so the SUPERADMIN who created the salon relays this link
    // themselves. Never logged, never stored anywhere but this one response.
    token: string;
  };
}

@Injectable()
export class SalonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreateSalonInput, actorUserId: string): Promise<CreateSalonResult> {
    if (!SUPPORTED_TIMEZONES.has(input.timezone)) {
      throw new BadRequestException('timezone must be a valid IANA time zone identifier.');
    }

    const slug = input.slug ?? slugify(input.name);
    if (!slug) {
      throw new BadRequestException('Could not derive a valid slug from the salon name.');
    }

    const existing = await this.prisma.salon.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('A salon with this slug already exists.');
    }

    const { token, tokenHash } = this.tokens.generate();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    const salon = await this.prisma.$transaction(async (tx: import('@salonomia/database').Prisma.TransactionClient) => {
      const created = await tx.salon.create({
        data: {
          name: input.name,
          slug,
          timezone: input.timezone,
          city: input.city,
          description: input.description,
          addressLine: input.addressLine,
          phone: input.phone,
          email: input.email,
          genderFocus: input.genderFocus,
          bookingPolicy: { create: {} }, // safe conventional defaults (see schema.prisma)
        },
        select: {
          id: true,
          slug: true,
          name: true,
          status: true,
          city: true,
          timezone: true,
          createdAt: true,
        },
      });

      await tx.salonInvitation.create({
        data: {
          salonId: created.id,
          email: input.adminEmail,
          role: 'SALON_ADMIN',
          tokenHash,
          expiresAt,
          invitedByUserId: actorUserId,
        },
      });

      return created;
    });

    await this.audit.record({
      actorUserId,
      action: 'salon.created',
      targetType: 'Salon',
      targetId: salon.id,
      salonId: salon.id,
      metadata: { adminEmailInvited: input.adminEmail },
    });

    return { salon, invitation: { email: input.adminEmail, expiresAt, token } };
  }

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
        ...DETAIL_SELECT,
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

  async update(
    salonId: string,
    input: UpdateSalonInput,
    actorUserId: string,
  ): Promise<SalonDetail> {
    const current = await this.prisma.salon.findUnique({ where: { id: salonId } });
    if (!current) {
      throw new NotFoundException();
    }

    if (input.expectedUpdatedAt) {
      const expected = new Date(input.expectedUpdatedAt).getTime();
      if (expected !== current.updatedAt.getTime()) {
        throw new ConflictException(
          'This salon was changed by someone else. Reload and try again.',
        );
      }
    }

    if (input.timezone && !SUPPORTED_TIMEZONES.has(input.timezone)) {
      throw new BadRequestException('timezone must be a valid IANA time zone identifier.');
    }

    // Explicit allowlist, built field-by-field from validated input — never a spread of the raw
    // body (docs/security/authorization.md / validation-contract skill).
    const data: Record<string, unknown> = {};
    const editableFields = [
      'name',
      'timezone',
      'city',
      'description',
      'addressLine',
      'phone',
      'email',
      'genderFocus',
    ] as const;
    for (const field of editableFields) {
      if (field in input) data[field] = input[field];
    }

    const updated = await this.prisma.salon.update({
      where: { id: salonId },
      data,
      select: {
        ...DETAIL_SELECT,
        _count: { select: { memberships: { where: { status: 'ACTIVE' } } } },
      },
    });

    await this.audit.record({
      actorUserId,
      action: 'salon.updated',
      targetType: 'Salon',
      targetId: salonId,
      salonId,
      metadata: { changedFields: Object.keys(data) },
    });

    const { _count, ...rest } = updated;
    return { ...rest, activeMembershipCount: _count.memberships };
  }

  async suspend(
    salonId: string,
    input: SalonLifecycleActionInput,
    actorUserId: string,
  ): Promise<SalonDetail> {
    return this.setStatus(salonId, 'SUSPENDED', 'salon.suspended', input, actorUserId);
  }

  async restore(
    salonId: string,
    input: SalonLifecycleActionInput,
    actorUserId: string,
  ): Promise<SalonDetail> {
    return this.setStatus(salonId, 'ACTIVE', 'salon.restored', input, actorUserId);
  }

  private async setStatus(
    salonId: string,
    status: 'ACTIVE' | 'SUSPENDED',
    auditAction: string,
    input: SalonLifecycleActionInput,
    actorUserId: string,
  ): Promise<SalonDetail> {
    const current = await this.prisma.salon.findUnique({ where: { id: salonId } });
    if (!current) {
      throw new NotFoundException();
    }

    // deletedAt is intentionally untouched: it marks genuine (future, not-yet-implemented) deletion,
    // not suspension — ADR-0006 keeps those two concepts separate.
    const updated = await this.prisma.salon.update({
      where: { id: salonId },
      data: { status },
      select: {
        ...DETAIL_SELECT,
        _count: { select: { memberships: { where: { status: 'ACTIVE' } } } },
      },
    });

    await this.audit.record({
      actorUserId,
      action: auditAction,
      targetType: 'Salon',
      targetId: salonId,
      salonId,
      metadata: input.reason ? { reason: input.reason } : undefined,
    });

    const { _count, ...rest } = updated;
    return { ...rest, activeMembershipCount: _count.memberships };
  }
}
