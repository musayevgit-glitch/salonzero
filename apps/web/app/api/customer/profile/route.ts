import { NextRequest, NextResponse } from 'next/server';
import { updateCustomerProfileSchema } from '@salonomia/validation';
import { verifyRequest, unauthorized } from '../../../../lib/server/auth';
import { prisma } from '../../../../lib/server/prisma';
import { recordAudit } from '../../../../lib/server/audit';

const PROFILE_SELECT = { id: true, email: true, fullName: true, phone: true, marketingConsent: true } as const;

export async function GET(req: NextRequest) {
  const payload = verifyRequest(req);
  if (!payload) return unauthorized();

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: PROFILE_SELECT });
  if (!user) return NextResponse.json({ message: 'Not found.' }, { status: 404 });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const payload = verifyRequest(req);
  if (!payload) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = updateCustomerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const data: { fullName?: string; phone?: string | null; marketingConsent?: boolean } = {};
  if (parsed.data.fullName !== undefined) data.fullName = parsed.data.fullName;
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
  if (parsed.data.marketingConsent !== undefined) data.marketingConsent = parsed.data.marketingConsent;

  const updated = await prisma.user.update({ where: { id: payload.sub }, data, select: PROFILE_SELECT });
  await recordAudit({ actorUserId: payload.sub, action: 'customer_profile.updated', targetType: 'User', targetId: payload.sub, metadata: { changedFields: Object.keys(data) } });

  return NextResponse.json(updated);
}
