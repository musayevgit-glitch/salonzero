import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../../lib/server/auth';
import { createWorkingScheduleSchema } from '@salonomia/validation';
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

  const schedule = await prisma.workingSchedule.findMany({
    where: { employeeId },
    orderBy: [{ weekday: 'asc' }, { startMinuteOfDay: 'asc' }],
  });

  return NextResponse.json(schedule);
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
    return badRequest('Cannot manage the schedule of an inactive employee.');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = createWorkingScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  const sameDay = await prisma.workingSchedule.findMany({
    where: { employeeId, weekday: input.weekday },
  });
  const overlaps = sameDay.some(
    (existing) =>
      input.startMinuteOfDay < existing.endMinuteOfDay &&
      existing.startMinuteOfDay < input.endMinuteOfDay
  );
  if (overlaps) {
    return badRequest('This interval overlaps an existing working-schedule entry for that day.');
  }

  const entry = await prisma.workingSchedule.create({
    data: {
      employeeId,
      weekday: input.weekday,
      startMinuteOfDay: input.startMinuteOfDay,
      endMinuteOfDay: input.endMinuteOfDay,
    },
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'working_schedule.created',
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
