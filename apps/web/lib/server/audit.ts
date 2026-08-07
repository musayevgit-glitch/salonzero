import { prisma } from './prisma';

interface AuditParams {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  salonId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        salonId: params.salonId ?? null,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
      },
    });
  } catch {
    // Never let audit failures surface to the caller.
  }
}
