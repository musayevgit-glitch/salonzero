import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest, unauthorized } from '../../../../../lib/server/auth';
import { prisma } from '../../../../../lib/server/prisma';

// Backs the header bell badge. Polled, so it stays a single indexed count
// (Notification(userId, readAt)) and returns nothing about the notifications themselves.
export async function GET(req: NextRequest) {
  const payload = verifyRequest(req);
  if (!payload) return unauthorized();

  const count = await prisma.notification.count({
    where: { userId: payload.sub, readAt: null },
  });

  return NextResponse.json({ count });
}
