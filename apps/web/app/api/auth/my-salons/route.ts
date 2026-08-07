import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest, unauthorized } from '../../../../lib/server/auth';
import { prisma } from '../../../../lib/server/prisma';

export async function GET(req: NextRequest) {
  const payload = verifyRequest(req);
  if (!payload) return unauthorized();

  const memberships = await prisma.salonMembership.findMany({
    where: { userId: payload.sub, status: 'ACTIVE', salon: { status: 'ACTIVE' } },
    select: { role: true, salon: { select: { id: true, name: true } } },
  });

  return NextResponse.json(
    memberships.map((m) => ({ salonId: m.salon.id, salonName: m.salon.name, role: m.role })),
  );
}
