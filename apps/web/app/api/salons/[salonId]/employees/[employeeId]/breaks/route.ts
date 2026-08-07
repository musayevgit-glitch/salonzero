import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../../lib/server/auth';
import { createBreakSchema } from '@salonomia/validation';
import { recordAudit } from '../../../../../../../lib/server/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string }> }
) {
  const { salonId, employeeId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId },
    select: { id: true },
  });
  if (!employee) return notFound();

  const breaks = await prisma.break.findMany({
    where: { employeeId },
    orderBy: [{ weekday: 'asc' }, { startMinuteOfDay: 'asc' }],
  });

  return NextResponse.json(breaks);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string }> }
) {
  const { salonId, employeeId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId },
    select: { id: true, isActive: true },
  });
  if (!employee) return notFound();
  if (!employee.isActive) {
    return badRequest('Cannot manage breaks for an inactive employee.');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = createBreakSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  const sameDaySchedule = await prisma.workingSchedule.findMany({
    where: { employeeId, weekday: input.weekday },
  });
  const fitsWithinSchedule = sameDaySchedule.some(
    (ws) =>
      input.startMinuteOfDay >= ws.startMinuteOfDay && input.endMinuteOfDay <= ws.endMinuteOfDay
  );
  if (!fitsWithinSchedule) {
    return badRequest('This break must fit entirely within an existing working-schedule block for that day.');
  }

  const sameDayBreaks = await prisma.break.findMany({
    where: { employeeId, weekday: input.weekday },
  });
  const overlapsBreak = sameDayBreaks.some(
    (existing) =>
      input.startMinuteOfDay < existing.endMinuteOfDay &&
      existing.startMinuteOfDay < input.endMinuteOfDay
  );
  if (overlapsBreak) {
    return badRequest('This break overlaps an existing break for that day.');
  }

  const entry = await prisma.break.create({
    data: {
      employeeId,
      weekday: input.weekday,
      startMinuteOfDay: input.startMinuteOfDay,
      endMinuteOfDay: input.endMinuteOfDay,
    },
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'break.created',
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId,
    metadata: {
      weekday: input.weekday,
      startMinuteOfDay: input.startMinuteOfDay,
      endMinuteOfDay: input.endMinuteOfDay,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
