import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../lib/server/salon-context';
import { auditLogQuerySchema } from '@salonomia/validation';

const SENSITIVE_METADATA_KEY = /password|secret|token|cookie|authorization/i;

function sanitizeMetadata(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, val]) => [
      key,
      SENSITIVE_METADATA_KEY.test(key) ? '[REDACTED]' : val,
    ]),
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ salonId: string }> }) {
  const { salonId } = await params;
  const ctx = await getSalonContext(req, salonId, 'ANY');
  if (isSalonContextError(ctx)) return ctx;

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
    return NextResponse.json(
      { message: 'Invalid query parameters.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const query = parsed.data;
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;

  const where = {
    salonId,
    ...(query.action ? { action: { contains: query.action } } : {}),
    ...(query.targetType ? { targetType: query.targetType } : {}),
    ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize, // wait, pageSIZE or pageSize? In audit.ts we used pageSize. Let's make sure it is pageSize.
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const actorIds = [...new Set(items.map((l) => l.actorUserId).filter(Boolean))] as string[];
  const actors =
    actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, email: true, fullName: true },
        })
      : [];
  const actorMap = Object.fromEntries(actors.map((a) => [a.id, a]));

  const sanitizedItems = items.map((l) => ({
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
