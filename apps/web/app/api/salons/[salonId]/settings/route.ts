import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../lib/server/auth';
import { recordAudit } from '../../../../../lib/server/audit';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  // Salon Profile fields
  description: z.string().nullable().optional(),
  addressLine: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().or(z.literal('')).optional(),
  genderFocus: z.enum(['WOMEN', 'MEN', 'UNISEX']).nullable().optional(),

  // Booking Policy fields
  autoConfirm: z.boolean().optional(),
  minNoticeMinutes: z.number().int().min(0).max(1440).optional(),
  maxAdvanceDays: z.number().int().min(1).max(365).optional(),
  cancellationWindowHours: z.number().int().min(0).max(168).optional(),
  rescheduleWindowHours: z.number().int().min(0).max(168).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string }> }
) {
  const { salonId } = await params;
  const ctx = await getSalonContext(req, salonId, 'salon.settings.view');
  if (isSalonContextError(ctx)) return ctx;

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      addressLine: true,
      phone: true,
      email: true,
      genderFocus: true,
      bookingPolicy: {
        select: {
          autoConfirm: true,
          minNoticeMinutes: true,
          maxAdvanceDays: true,
          cancellationWindowHours: true,
          rescheduleWindowHours: true,
        },
      },
    },
  });

  if (!salon) return notFound();

  return NextResponse.json(salon);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string }> }
) {
  const { salonId } = await params;
  const ctx = await getSalonContext(req, salonId, 'salon.settings.manage');
  if (isSalonContextError(ctx)) return ctx;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  // Perform updates in a transaction
  const updated = await prisma.$transaction(async (tx) => {
    // 1. Update Salon Profile fields
    const salonData: Record<string, unknown> = {};
    if (input.description !== undefined) salonData.description = input.description;
    if (input.addressLine !== undefined) salonData.addressLine = input.addressLine;
    if (input.phone !== undefined) salonData.phone = input.phone;
    if (input.email !== undefined) salonData.email = input.email || null;
    if (input.genderFocus !== undefined) salonData.genderFocus = input.genderFocus;

    const salon = await tx.salon.update({
      where: { id: salonId },
      data: salonData,
    });

    // 2. Update Booking Policy fields
    const policyData: Record<string, unknown> = {};
    if (input.autoConfirm !== undefined) policyData.autoConfirm = input.autoConfirm;
    if (input.minNoticeMinutes !== undefined) policyData.minNoticeMinutes = input.minNoticeMinutes;
    if (input.maxAdvanceDays !== undefined) policyData.maxAdvanceDays = input.maxAdvanceDays;
    if (input.cancellationWindowHours !== undefined) policyData.cancellationWindowHours = input.cancellationWindowHours;
    if (input.rescheduleWindowHours !== undefined) policyData.rescheduleWindowHours = input.rescheduleWindowHours;

    if (Object.keys(policyData).length > 0) {
      await tx.bookingPolicy.upsert({
        where: { salonId },
        update: policyData,
        create: {
          salonId,
          autoConfirm: input.autoConfirm ?? false,
          minNoticeMinutes: input.minNoticeMinutes ?? 60,
          maxAdvanceDays: input.maxAdvanceDays ?? 60,
          cancellationWindowHours: input.cancellationWindowHours ?? 24,
          rescheduleWindowHours: input.rescheduleWindowHours ?? 24,
        },
      });
    }

    return salon;
  });

  await recordAudit({
    actorUserId: ctx.userId,
    action: 'salon.settings.updated',
    targetType: 'Salon',
    targetId: salonId,
    salonId,
    metadata: { changedFields: Object.keys(input) },
  });

  return NextResponse.json({ ok: true });
}
