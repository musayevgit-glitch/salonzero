import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEventInput {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  salonId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  // Safe, small metadata only — never secrets/tokens/passwords (docs/security/security-requirements.md).
  // Using Record<string,unknown> instead of Prisma.InputJsonValue which was removed in Prisma 6.
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditEventInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: event.actorUserId ?? null,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        salonId: event.salonId ?? null,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
        requestId: event.requestId ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (event.metadata ?? null) as any,
      },
    });
  }
}
