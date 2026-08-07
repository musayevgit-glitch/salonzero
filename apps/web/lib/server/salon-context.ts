import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest, unauthorized, forbidden, notFound } from './auth';
import { prisma } from './prisma';

export type SalonRole = 'SALON_ADMIN' | 'SALON_MANAGER' | 'SUPERADMIN';

export interface SalonContext {
  userId: string;
  salonId: string;
  role: SalonRole;
  isSuperadmin: boolean;
}

type SalonContextResult = SalonContext | NextResponse;

export async function getSalonContext(
  req: NextRequest,
  salonId: string,
  requiredRole: 'SALON_ADMIN' | 'ANY' = 'ANY',
): Promise<SalonContextResult> {
  const payload = verifyRequest(req);
  if (!payload) return unauthorized();

  if (payload.isSuperadmin) {
    const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { id: true } });
    if (!salon) return notFound();
    return { userId: payload.sub, salonId, role: 'SUPERADMIN', isSuperadmin: true };
  }

  const membership = await prisma.salonMembership.findUnique({
    where: { userId_salonId: { userId: payload.sub, salonId } },
    select: { role: true, status: true },
  });
  if (!membership || membership.status !== 'ACTIVE') return forbidden();

  if (requiredRole === 'SALON_ADMIN' && membership.role !== 'SALON_ADMIN') return forbidden();

  return {
    userId: payload.sub,
    salonId,
    role: membership.role as SalonRole,
    isSuperadmin: false,
  };
}

export function isSalonContextError(v: SalonContextResult): v is NextResponse {
  return v instanceof NextResponse;
}

// Superadmin-only gate — returns unauthorized/forbidden if not superadmin.
export function requireSuperadmin(req: NextRequest): { userId: string } | NextResponse {
  const payload = verifyRequest(req);
  if (!payload) return unauthorized();
  if (!payload.isSuperadmin) return forbidden();
  return { userId: payload.sub };
}
