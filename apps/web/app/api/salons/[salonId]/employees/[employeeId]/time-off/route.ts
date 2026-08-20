import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/server/prisma';
import {
  getSalonContext,
  isSalonContextError,
} from '../../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../../lib/server/auth';
import { createTimeOffSchema } from '@salonomia/validation';
import { recordAudit } from '../../../../../../../lib/server/audit';

const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN'] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string }> },
) {
  const { salonId, employeeId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId },
    select: { id: true },
  });
  if (!employee) return notFound();

  const list = await prisma.timeOff.findMany({
    where: { employeeId },
    orderBy: { startAt: 'asc' },
    select: { id: true, startAt: true, endAt: true, reason: true },
  });

  return NextResponse.json(list);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string }> },
) {
  const { salonId, employeeId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId },
    select: { id: true },
  });
  if (!employee) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = createTimeOffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid input.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);

  const overlappingTimeOff = await prisma.timeOff.findFirst({
    where: { employeeId, startAt: { lt: endAt }, endAt: { gt: startAt } },
  });
  if (overlappingTimeOff) {
    return NextResponse.json(
      { message: 'This overlaps an existing time-off period for this employee.' },
      { status: 409 },
    );
  }

  if (!input.acknowledgeConflicts) {
    const conflicts = await prisma.reservation.findMany({
      where: {
        salonId,
        employeeId,
        status: { in: [...ACTIVE_RESERVATION_STATUSES] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true, startAt: true, endAt: true, status: true },
      orderBy: { startAt: 'asc' },
    });

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          message:
            'This time-off period overlaps existing reservations. Review them and resubmit with acknowledgeConflicts to proceed.',
          conflicts,
        },
        { status: 409 },
      );
    }
  }

  const entry = await prisma.timeOff.create({
    data: { employeeId, startAt, endAt, reason: input.reason ?? null },
    select: { id: true, startAt: true, endAt: true, reason: true },
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'time_off.created',
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId,
    metadata: {
      startAt: entry.startAt.toISOString(),
      endAt: entry.endAt.toISOString(),
      acknowledgedConflicts: input.acknowledgeConflicts ?? false,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
