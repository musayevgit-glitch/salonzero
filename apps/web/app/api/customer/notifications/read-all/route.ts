import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest, unauthorized } from '../../../../../lib/server/auth';
import { prisma } from '../../../../../lib/server/prisma';

// Marks every unread notification of the *authenticated* user read. The filter carries the
// userId, so there is no way to widen this to another account.
export async function POST(req: NextRequest) {
  const payload = verifyRequest(req);
  if (!payload) return unauthorized();

  const result = await prisma.notification.updateMany({
    where: { userId: payload.sub, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ updated: result.count });
}
