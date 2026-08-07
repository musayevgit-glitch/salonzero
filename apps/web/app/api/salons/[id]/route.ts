import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/server/prisma';
import { badRequest, notFound } from '../../../../lib/server/auth';
import { requireSuperadmin } from '../../../../lib/server/salon-context';
import { updateSalonSchema } from '@salonomia/validation';
import { recordAudit } from '../../../../lib/server/audit';

const SUPPORTED_TIMEZONES = new Set([...Intl.supportedValuesOf('timeZone'), 'UTC']);

const DETAIL_SELECT = {
  id: true,
  slug: true,
  name: true,
  status: true,
  city: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
  description: true,
  addressLine: true,
  phone: true,
  email: true,
  subdomain: true,
  customDomain: true,
  genderFocus: true,
} as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const superadminCheck = requireSuperadmin(req);
  if (superadminCheck instanceof NextResponse) return superadminCheck;

  const { id: salonId } = await params;

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      ...DETAIL_SELECT,
      _count: { select: { memberships: { where: { status: 'ACTIVE' } } } },
    },
  });

  if (!salon) return notFound();

  const { _count, ...rest } = salon;
  return NextResponse.json({ ...rest, activeMembershipCount: _count.memberships });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const superadminCheck = requireSuperadmin(req);
  if (superadminCheck instanceof NextResponse) return superadminCheck;

  const { id: salonId } = await params;

  const current = await prisma.salon.findUnique({ where: { id: salonId } });
  if (!current) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = updateSalonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  if (input.expectedUpdatedAt) {
    const expected = new Date(input.expectedUpdatedAt).getTime();
    if (expected !== current.updatedAt.getTime()) {
      return NextResponse.json({ message: 'This salon was changed by someone else. Reload and try again.' }, { status: 409 });
    }
  }

  if (input.timezone && !SUPPORTED_TIMEZONES.has(input.timezone)) {
    return badRequest('timezone must be a valid IANA time zone identifier.');
  }

  const data: Record<string, unknown> = {};
  const editableFields = [
    'name',
    'timezone',
    'city',
    'description',
    'addressLine',
    'phone',
    'email',
    'genderFocus',
  ] as const;
  for (const field of editableFields) {
    if (field in input) data[field] = input[field];
  }

  const updated = await prisma.salon.update({
    where: { id: salonId },
    data,
    select: {
      ...DETAIL_SELECT,
      _count: { select: { memberships: { where: { status: 'ACTIVE' } } } },
    },
  });

  await recordAudit({
    actorUserId: superadminCheck.userId,
    action: 'salon.updated',
    targetType: 'Salon',
    targetId: salonId,
    salonId,
    metadata: { changedFields: Object.keys(data) },
  });

  const { _count, ...rest } = updated;
  return NextResponse.json({ ...rest, activeMembershipCount: _count.memberships });
}
