import { Injectable, NotFoundException } from '@nestjs/common';
import type { UpdateCustomerProfileInput } from '@salonomia/validation';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export interface CustomerProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  marketingConsent: boolean;
}

const PROFILE_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  marketingConsent: true,
} as const;

@Injectable()
export class CustomerProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(userId: string): Promise<CustomerProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });
    if (!user) throw new NotFoundException();
    return user;
  }

  async update(userId: string, input: UpdateCustomerProfileInput): Promise<CustomerProfile> {
    // Field-by-field from the allowlisted input — never a spread of the raw body — so a future
    // schema change can't silently widen what this can write.
    const data: { fullName?: string; phone?: string | null; marketingConsent?: boolean } = {};
    if (input.fullName !== undefined) data.fullName = input.fullName;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.marketingConsent !== undefined) data.marketingConsent = input.marketingConsent;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: PROFILE_SELECT,
    });

    await this.audit.record({
      actorUserId: userId,
      action: 'customer_profile.updated',
      targetType: 'User',
      targetId: userId,
      salonId: null,
      metadata: { changedFields: Object.keys(data) },
    });

    return updated;
  }
}
