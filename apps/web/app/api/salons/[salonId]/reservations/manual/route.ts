import * as crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../lib/server/auth';
import { createManualReservationSchema } from '@salonomia/validation';
import { isEmployeeSlotAvailable } from '../../../../../../lib/server/availability';
import { recordAudit } from '../../../../../../lib/server/audit';

const SLOT_UNAVAILABLE = 'This time is no longer available. Please choose another time.';
const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN'] as const;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60_000;

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const r = value as Record<string, unknown>;
  return `{${Object.keys(r).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(r[k])}`).join(',')}}`;
}

function hashPayload(payload: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(canonicalJson(payload)).digest('hex');
}

const RESERVATION_SELECT = {
  id: true, salonId: true, serviceId: true, employeeId: true, status: true,
  startAt: true, endAt: true, priceAmount: true, currency: true, customerNote: true, guestName: true, createdAt: true,
} as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string }> }
) {
  const { salonId } = await params;
  const ctx = await getSalonContext(req, salonId, 'ANY'); // ANY allows SALON_MANAGER, SALON_ADMIN, and SUPERADMIN
  if (isSalonContextError(ctx)) return ctx;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = createManualReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const now = new Date();

  // Find or create customer user
  let customer = await prisma.user.findUnique({ where: { email: input.customerEmail } });
  if (!customer) {
    customer = await prisma.user.create({
      data: {
        email: input.customerEmail,
        passwordHash: `unset:${crypto.randomUUID()}`,
        fullName: input.customerFullName,
      },
    });
  }
  const customerId = customer.id;

  const idempotencyPayloadHash = input.idempotencyKey
    ? hashPayload({
        customerEmail: input.customerEmail,
        customerFullName: input.customerFullName,
        serviceId: input.serviceId,
        employeeId: input.employeeId ?? null,
        startAt: input.startAt,
        customerNote: input.customerNote ?? null,
      })
    : null;

  if (input.idempotencyKey && idempotencyPayloadHash) {
    const existing = await prisma.reservation.findUnique({
      where: { customerId_idempotencyKey: { customerId, idempotencyKey: input.idempotencyKey } },
      select: { ...RESERVATION_SELECT, idempotencyPayloadHash: true, idempotencyExpiresAt: true },
    });
    if (existing) {
      if (existing.idempotencyExpiresAt && existing.idempotencyExpiresAt < now) {
        return NextResponse.json({ message: 'This idempotency key has expired.' }, { status: 409 });
      }
      if (existing.idempotencyPayloadHash && existing.idempotencyPayloadHash !== idempotencyPayloadHash) {
        return NextResponse.json({ message: 'This idempotency key was already used for a different request.' }, { status: 409 });
      }
      const { idempotencyPayloadHash: _h, idempotencyExpiresAt: _e, ...reservation } = existing;
      return NextResponse.json(reservation, { status: 201 });
    }
  }

  const salon = await prisma.salon.findFirst({
    where: { id: salonId, status: 'ACTIVE' },
    select: { id: true, timezone: true },
  });
  if (!salon) return notFound('Salon not found.');

  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, salonId: salon.id, isActive: true },
    select: { id: true, durationMinutes: true, bufferMinutes: true, priceAmount: true, currency: true },
  });
  if (!service) return badRequest('This service is not available at this salon.');

  const bookingPolicy = await prisma.bookingPolicy.findUnique({ where: { salonId: salon.id } });
  if (!bookingPolicy) return badRequest('This salon is not configured for booking.');

  const startAt = new Date(input.startAt);
  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);
  const blockedUntil = new Date(startAt.getTime() + (service.durationMinutes + service.bufferMinutes) * 60_000);

  // If a SALON_MANAGER is requesting, restrict employee candidates to themselves.
  let filterEmployeeId = input.employeeId;
  if (ctx.role === 'SALON_MANAGER') {
    const employee = await prisma.employeeProfile.findFirst({
      where: { salonId, userId: ctx.userId },
      select: { id: true },
    });
    if (!employee) {
      return badRequest('SALON_MANAGER does not have an associated employee profile in this salon.');
    }
    if (filterEmployeeId && filterEmployeeId !== employee.id) {
      return badRequest('SALON_MANAGER can only book reservations for themselves.');
    }
    filterEmployeeId = employee.id;
  }

  const employeeWhere = {
    salonId: salon.id, isActive: true,
    eligibleServices: { some: { serviceId: service.id } },
    ...(filterEmployeeId ? { id: filterEmployeeId } : {}),
  };
  const candidates = await prisma.employeeProfile.findMany({
    where: employeeWhere,
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  if (candidates.length === 0) return badRequest('No eligible stylist is available for this service.');

  const windowStart = new Date(startAt.getTime() - 24 * 60 * 60_000);
  const windowEnd = new Date(startAt.getTime() + 24 * 60 * 60_000);
  let chosenEmployeeId: string | null = null;

  for (const candidate of candidates) {
    const [workingSchedule, breaks, timeOff, blockingReservations] = await Promise.all([
      prisma.workingSchedule.findMany({ where: { employeeId: candidate.id } }),
      prisma.break.findMany({ where: { employeeId: candidate.id } }),
      prisma.timeOff.findMany({ where: { employeeId: candidate.id, startAt: { lt: windowEnd }, endAt: { gt: windowStart } } }),
      prisma.reservation.findMany({
        where: { employeeId: candidate.id, status: { in: [...ACTIVE_STATUSES] }, startAt: { lt: windowEnd }, blockedUntil: { gt: windowStart } },
        select: { startAt: true, endAt: true, blockedUntil: true },
      }),
    ]);

    const available = isEmployeeSlotAvailable({
      employee: { employeeId: candidate.id, isActive: true, isEligibleForService: true, workingSchedule, breaks, timeOff, blockingReservations },
      salonTimezone: salon.timezone, now, candidateStart: startAt,
      serviceDurationMinutes: service.durationMinutes, bufferMinutes: service.bufferMinutes,
      minNoticeMinutes: bookingPolicy.minNoticeMinutes, maxAdvanceDays: bookingPolicy.maxAdvanceDays,
    });
    if (available) { chosenEmployeeId = candidate.id; break; }
  }

  if (!chosenEmployeeId) return NextResponse.json({ message: SLOT_UNAVAILABLE }, { status: 409 });

  const status = bookingPolicy.autoConfirm ? 'CONFIRMED' : 'PENDING';

  try {
    const created = await prisma.$transaction(async (tx) => {
      const conflicting = await tx.reservation.count({
        where: { employeeId: chosenEmployeeId!, status: { in: [...ACTIVE_STATUSES] }, startAt: { lt: blockedUntil }, blockedUntil: { gt: startAt } },
      });
      if (conflicting > 0) throw new Error('SLOT_CONFLICT');

      const reservation = await tx.reservation.create({
        data: {
          salonId: salon.id, serviceId: service.id, employeeId: chosenEmployeeId!,
          customerId, status, startAt, endAt, blockedUntil,
          priceAmount: service.priceAmount, currency: service.currency,
          customerNote: input.customerNote ?? null,
          guestName: input.customerFullName,
          idempotencyKey: input.idempotencyKey,
          idempotencyPayloadHash,
          idempotencyExpiresAt: input.idempotencyKey ? new Date(now.getTime() + IDEMPOTENCY_TTL_MS) : null,
        },
        select: RESERVATION_SELECT,
      });

      await tx.reservationStatusHistory.create({ data: { reservationId: reservation.id, fromStatus: null, toStatus: status, changedByUserId: ctx.userId } });
      await tx.notification.create({ data: { userId: customerId, type: status === 'CONFIRMED' ? 'reservation.confirmed' : 'reservation.pending_customer', payload: { reservationId: reservation.id } } });

      return reservation;
    });

    await recordAudit({ actorUserId: ctx.userId, action: 'reservation.created', targetType: 'Reservation', targetId: created.id, salonId: salon.id });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'SLOT_CONFLICT' || msg.includes('reservation_no_overlap_per_employee') || msg.includes('deadlock')) {
      return NextResponse.json({ message: SLOT_UNAVAILABLE }, { status: 409 });
    }
    throw err;
  }
}
