import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/server/prisma';
import { badRequest } from '../../../lib/server/auth';
import { requireSuperadmin } from '../../../lib/server/salon-context';
import { createSalonSchema, listSalonsQuerySchema } from '@salonomia/validation';
import { generateToken } from '../../../lib/server/token';
import { recordAudit } from '../../../lib/server/audit';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SUPPORTED_TIMEZONES = new Set([...Intl.supportedValuesOf('timeZone'), 'UTC']);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function GET(req: NextRequest) {
  const superadminCheck = requireSuperadmin(req);
  if (superadminCheck instanceof NextResponse) return superadminCheck;

  const url = new URL(req.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());

  const parsed = listSalonsQuerySchema.safeParse({
    page: searchParams.page ? Number(searchParams.page) : undefined,
    pageSize: searchParams.pageSize ? Number(searchParams.pageSize) : undefined,
    search: searchParams.search || undefined,
    status: searchParams.status || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid query parameters.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const query = parsed.data;
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;

  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { slug: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.salon.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        city: true,
        timezone: true,
        logoUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.salon.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const superadminCheck = requireSuperadmin(req);
  if (superadminCheck instanceof NextResponse) return superadminCheck;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = createSalonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  if (!SUPPORTED_TIMEZONES.has(input.timezone)) {
    return badRequest('timezone must be a valid IANA time zone identifier.');
  }

  const slug = input.slug ?? slugify(input.name);
  if (!slug) {
    return badRequest('Could not derive a valid slug from the salon name.');
  }

  const existing = await prisma.salon.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ message: 'A salon with this slug already exists.' }, { status: 409 });
  }

  const { token, tokenHash } = generateToken();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

  const salon = await prisma.$transaction(async (tx) => {
    const created = await tx.salon.create({
      data: {
        name: input.name,
        slug,
        timezone: input.timezone,
        city: input.city,
        description: input.description,
        addressLine: input.addressLine,
        phone: input.phone,
        email: input.email,
        genderFocus: input.genderFocus,
        bookingPolicy: { create: {} },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        city: true,
        timezone: true,
        logoUrl: true,
        createdAt: true,
      },
    });

    await tx.salonInvitation.create({
      data: {
        salonId: created.id,
        email: input.adminEmail,
        role: 'SALON_ADMIN',
        tokenHash,
        expiresAt,
        invitedByUserId: superadminCheck.userId,
      },
    });

    return created;
  });

  await recordAudit({
    actorUserId: superadminCheck.userId,
    action: 'salon.created',
    targetType: 'Salon',
    targetId: salon.id,
    salonId: salon.id,
    metadata: { adminEmailInvited: input.adminEmail },
  });

  return NextResponse.json({ salon, invitation: { email: input.adminEmail, expiresAt, token } }, { status: 201 });
}
