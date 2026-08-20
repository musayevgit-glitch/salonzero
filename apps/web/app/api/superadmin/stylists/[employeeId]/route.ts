import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../lib/server/auth';
import { recordAudit } from '../../../../../lib/server/audit';
import { z } from 'zod';

const updateStylistSchema = z.object({
  isActive: z.boolean().optional(),
  fullName: z.string().min(1).max(120).optional(),
  bio: z.string().max(1000).nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const superadminCheck = requireSuperadmin(req);
  if (superadminCheck instanceof NextResponse) return superadminCheck;

  const { employeeId } = await params;

  const employee = await prisma.employeeProfile.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      fullName: true,
      bio: true,
      photoUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      salon: { select: { id: true, name: true, timezone: true, status: true } },
      eligibleServices: {
        select: {
          service: {
            select: { id: true, name: true, isActive: true, priceAmount: true, currency: true },
          },
        },
      },
      workingSchedules: {
        select: { id: true, weekday: true, startMinuteOfDay: true, endMinuteOfDay: true },
        orderBy: { weekday: 'asc' },
      },
      portfolio: {
        select: { id: true, imageUrl: true, caption: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      },
      _count: { select: { reservations: true } },
    },
  });

  if (!employee) return notFound();

  return NextResponse.json({
    ...employee,
    services: employee.eligibleServices.map((es) => es.service),
    reservationCount: employee._count.reservations,
    eligibleServices: undefined,
    _count: undefined,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
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
    return NextResponse.json(
      { message: 'Invalid input.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { isActive, fullName, bio } = parsed.data;

  const data: Record<string, unknown> = {};
  if (isActive !== undefined) data.isActive = isActive;
  if (fullName !== undefined) data.fullName = fullName;
  if (bio !== undefined) data.bio = bio;

  const updated = await prisma.employeeProfile.update({
    where: { id: employeeId },
    data,
    select: {
      id: true,
      fullName: true,
      isActive: true,
      salonId: true,
    },
  });

  const action =
    isActive === true
      ? 'stylist.activated_by_admin'
      : isActive === false
        ? 'stylist.deactivated_by_admin'
        : 'stylist.updated_by_admin';

  await recordAudit({
    actorUserId: superadminCheck.userId,
    action,
    targetType: 'EmployeeProfile',
    targetId: employeeId,
    salonId: employee.salonId,
    metadata: { changedFields: Object.keys(data) },
  });

  return NextResponse.json(updated);
}
