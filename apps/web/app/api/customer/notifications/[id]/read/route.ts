import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest, unauthorized } from '../../../../../../lib/server/auth';
import { prisma } from '../../../../../../lib/server/prisma';

/**
 * Marks one notification read.
 *
 * The id from the URL is never used on its own: `updateMany` filters on `{ id, userId }` in a
 * single statement, so a notification belonging to another account matches zero rows and returns
 * 404 — the same response as an id that does not exist, which keeps the endpoint from confirming
 * whether someone else's notification id is real.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = verifyRequest(req);
  if (!payload) return unauthorized();

  const { id } = await params;

  const result = await prisma.notification.updateMany({
    where: { id, userId: payload.sub, readAt: null },
    data: { readAt: new Date() },
  });

  if (result.count === 0) {
    // Either it does not exist, is not this user's, or was already read. Re-check ownership so an
    // already-read notification is a success rather than a confusing 404.
    const existing = await prisma.notification.findFirst({
      where: { id, userId: payload.sub },
      select: { id: true, readAt: true },
    });
    if (!existing)
      return NextResponse.json({ message: 'Notification not found.' }, { status: 404 });
    return NextResponse.json({ id: existing.id, readAt: existing.readAt });
  }

  return NextResponse.json({ id, readAt: new Date().toISOString() });
}
