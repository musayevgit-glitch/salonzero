import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest, unauthorized } from '../../../../../lib/server/auth';
import { prisma } from '../../../../../lib/server/prisma';

// The prompt only ever asks about a handful of recent visits; an unbounded list would be a
// pointless read and a large response for a modal that shows one at a time.
const MAX_ELIGIBLE = 5;

/**
 * Completed, not-yet-rated reservations belonging to the authenticated customer.
 *
 * Backs the rating prompt. Scoped by `customerId = <authenticated user>` and by the absence of a
 * related Rating row, so it can never surface someone else's visit to rate.
 */
export async function GET(req: NextRequest) {
  const payload = verifyRequest(req);
  if (!payload) return unauthorized();

  const items = await prisma.reservation.findMany({
    where: {
      customerId: payload.sub,
      status: 'COMPLETED',
      ratings: { none: {} },
    },
    orderBy: { startAt: 'desc' },
    take: MAX_ELIGIBLE,
    select: {
      id: true,
      startAt: true,
      salon: { select: { name: true, slug: true } },
      service: { select: { name: true } },
      employee: { select: { fullName: true } },
    },
  });

  return NextResponse.json({ items });
}
