import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../lib/server/auth';
import { updateEmployeeSchema } from '@salonomia/validation';
import { recordAudit } from '../../../../../../lib/server/audit';

const SELECT = {
  id: true,
  fullName: true,
  bio: true,
  photoUrl: true,
  isActive: true,
  createdAt: true,
} as const;

const DETAIL_SELECT = { ...SELECT, updatedAt: true } as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string }> }
) {
  const { salonId, employeeId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId },
    select: DETAIL_SELECT,
  });

  if (!employee) return notFound();

  return NextResponse.json(employee);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string }> }
) {
  const { salonId, employeeId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  const current = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId },
  });
  if (!current) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = updateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  if (input.expectedUpdatedAt) {
    const expected = new Date(input.expectedUpdatedAt).getTime();
    if (expected !== current.updatedAt.getTime()) {
      return NextResponse.json({ message: 'This employee was changed by someone else. Reload and try again.' }, { status: 409 });
    }
  }

  const data: Record<string, unknown> = {};
  const editableFields = ['fullName', 'bio'] as const;
  for (const field of editableFields) {
    if (field in input) data[field] = input[field];
  }

  const updated = await prisma.employeeProfile.update({
    where: { id: employeeId, salonId },
    data,
    select: DETAIL_SELECT,
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'employee.updated',
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId,
    metadata: { changedFields: Object.keys(data) },
  });

  return NextResponse.json(updated);
}
