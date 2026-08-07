import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@salonomia/validation';
import { prisma } from '../../../../lib/server/prisma';
import { hashPassword } from '../../../../lib/server/password';
import { signJwt, JWT_COOKIE_OPTIONS } from '../../../../lib/server/jwt';
import { recordAudit } from '../../../../lib/server/audit';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, fullName } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ message: 'An account with this email already exists.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash, fullName } });

  await recordAudit({ actorUserId: user.id, action: 'user.registered', targetType: 'User', targetId: user.id });

  const token = signJwt({ sub: user.id, email: user.email, fullName: user.fullName, isSuperadmin: user.isSuperadmin });
  const res = NextResponse.json({ id: user.id, email: user.email, fullName: user.fullName, isSuperadmin: user.isSuperadmin }, { status: 201 });
  res.cookies.set('token', token, JWT_COOKIE_OPTIONS);
  return res;
}
