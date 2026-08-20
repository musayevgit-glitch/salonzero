import { NextRequest, NextResponse } from 'next/server';
import { listNotificationsQuerySchema } from '@salonomia/validation';
import { verifyRequest, unauthorized } from '../../../../lib/server/auth';
import { prisma } from '../../../../lib/server/prisma';

// Every read is scoped by the authenticated user's own id. There is deliberately no way to pass
// a userId in — a notification belongs to exactly one account and is never listed for another.
export async function GET(req: NextRequest) {
  const payload = verifyRequest(req);
  if (!payload) return unauthorized();

  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = listNotificationsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid query.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const { page, pageSize, unreadOnly } = parsed.data;
  const where = { userId: payload.sub, ...(unreadOnly ? { readAt: null } : {}) };

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, type: true, payload: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: payload.sub, readAt: null } }),
  ]);

  return NextResponse.json({ items, total, unreadCount, page, pageSize });
}
