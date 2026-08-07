import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../lib/server/auth';
import { recordAudit } from '../../../../../lib/server/audit';
import { z } from 'zod';

const updateStylistSchema = z.object({
  isActive: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const superadminCheck = requireSuperadmin(req);
  if (superadminCheck instanceof NextResponse) return superadminCheck;

  const { employeeId } = await params;

  const employee = await prisma.employeeProfile.findUnique({ where: { id: employeeId } });
  if (!employee) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = updateStylistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const { isActive } = parsed.data;

  const updated = await prisma.employeeProfile.update({
    where: { id: employeeId },
    data: { isActive },
    select: {
      id: true,
      fullName: true,
      isActive: true,
      salonId: true,
    },
  });

  await recordAudit({
    actorUserId: superadminCheck.userId,
    action: isActive ? 'stylist.activated_by_admin' : 'stylist.deactivated_by_admin',
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId: employee.salonId,
    metadata: { isActive },
  });

  return NextResponse.json(updated);
}
