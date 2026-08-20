import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@salonomia/validation';
import { prisma } from '../../../../lib/server/prisma';
import { verifyPassword } from '../../../../lib/server/password';
import { signJwt, JWT_COOKIE_OPTIONS } from '../../../../lib/server/jwt';
import { recordAudit } from '../../../../lib/server/audit';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid input.', errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.status !== 'ACTIVE' || !(await verifyPassword(user.passwordHash, password))) {
    await recordAudit({
      action: 'user.login_failed',
      targetType: 'User',
      targetId: user?.id ?? 'unknown',
    });
    return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
  }

  await recordAudit({
    actorUserId: user.id,
    action: 'user.login_succeeded',
    targetType: 'User',
    targetId: user.id,
  });

  const token = signJwt({
    sub: user.id,
    email: user.email,
    fullName: user.fullName,
    isSuperadmin: user.isSuperadmin,
  });
  const res = NextResponse.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isSuperadmin: user.isSuperadmin,
  });
  res.cookies.set('token', token, JWT_COOKIE_OPTIONS);
  return res;
}
