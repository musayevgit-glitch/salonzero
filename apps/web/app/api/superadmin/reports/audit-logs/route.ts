import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../../lib/server/salon-context';
import { auditLogQuerySchema } from '@salonomia/validation';

const SENSITIVE_METADATA_KEY = /password|secret|token|cookie|authorization/i;

function sanitizeMetadata(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, val]) => [
      key,
      SENSITIVE_METADATA_KEY.test(key) ? '[REDACTED]' : val,
    ])
  );
}

export async function GET(req: NextRequest) {
  const superadminCheck = requireSuperadmin(req);
  if (superadminCheck instanceof NextResponse) return superadminCheck;

  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());

  const parsed = auditLogQuerySchema.safeParse({
    page: searchParams.page ? Number(searchParams.page) : undefined,
    pageSize: searchParams.pageSize ? Number(searchParams.pageSize) : undefined,
    action: searchParams.action || undefined,
    targetType: searchParams.targetType || undefined,
    actorUserId: searchParams.actorUserId || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid query parameters.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const query = parsed.data;
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;

  const where = {
    ...(query.action ? { action: { contains: query.action } } : {}),
    ...(query.targetType ? { targetType: query.targetType } : {}),
    ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const actorIds = [...new Set(items.map((l: { actorUserId: string | null }) => l.actorUserId).filter(Boolean))] as string[];
  const actors =
    actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, email: true, fullName: true },
        })
      : [];
  const actorMap = Object.fromEntries(actors.map((a: { id: string; email: string; fullName: string }) => [a.id, a]));

  const sanitizedItems = items.map((l: { id: string; action: string; targetType: string; targetId: string | null; salonId: string | null; actorUserId: string | null; metadata: unknown; createdAt: Date }) => ({
    ...l,
    metadata: sanitizeMetadata(l.metadata),
    actor: l.actorUserId ? (actorMap[l.actorUserId] ?? null) : null,
  }));

  return NextResponse.json({
    items: sanitizedItems,
    total,
    page,
    pageSize,
  });
}
