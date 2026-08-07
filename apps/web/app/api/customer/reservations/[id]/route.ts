import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest, unauthorized } from '../../../../../lib/server/auth';
import { prisma } from '../../../../../lib/server/prisma';

const DETAIL_SELECT = {
  id: true, status: true, startAt: true, endAt: true, priceAmount: true, currency: true,
  customerNote: true, createdAt: true,
  service: { select: { id: true, name: true, durationMinutes: true } },
  employee: { select: { id: true, fullName: true } },
  salon: {
    select: {
      id: true, name: true, slug: true, timezone: true,
      bookingPolicy: { select: { cancellationWindowHours: true, rescheduleWindowHours: true } },
    },
  },
} as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const payload = verifyRequest(req);
  if (!payload) return unauthorized();

  const { id } = await params;
  const r = await prisma.reservation.findFirst({ where: { id, customerId: payload.sub }, select: DETAIL_SELECT });
  if (!r) return NextResponse.json({ message: 'Reservation not found.' }, { status: 404 });

  const now = new Date();
  const policy = r.salon.bookingPolicy;
  const cancelWindow = (policy?.cancellationWindowHours ?? 24) * 3_600_000;
  const rescheduleWindow = (policy?.rescheduleWindowHours ?? 24) * 3_600_000;
  const cancellable = ['PENDING', 'CONFIRMED'].includes(r.status);

  return NextResponse.json({
    ...r,
    canCancel: cancellable && r.startAt.getTime() - now.getTime() > cancelWindow,
    canReschedule: cancellable && r.startAt.getTime() - now.getTime() > rescheduleWindow,
  });
}
