import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest, unauthorized } from '../../../../lib/server/auth';
import { prisma } from '../../../../lib/server/prisma';

export async function GET(req: NextRequest) {
  const payload = verifyRequest(req);
  if (!payload) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, fullName: true, isSuperadmin: true, status: true },
  });
  if (!user || user.status !== 'ACTIVE') return unauthorized();

  return NextResponse.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isSuperadmin: user.isSuperadmin,
  });
}
