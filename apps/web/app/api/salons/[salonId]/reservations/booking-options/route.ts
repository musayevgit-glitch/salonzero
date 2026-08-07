import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../lib/server/salon-context';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string }> }
) {
  const { salonId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const [services, employees] = await Promise.all([
    prisma.service.findMany({
      where: { salonId, isActive: true },
      select: { id: true, name: true, durationMinutes: true, priceAmount: true, currency: true },
      orderBy: { name: 'asc' },
    }),
    prisma.employeeProfile.findMany({
      where: { salonId, isActive: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    }),
  ]);

  return NextResponse.json({ services, employees });
}
