import { NextRequest, NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@salonomia/validation';
import { prisma } from '../../../../lib/server/prisma';
import { generateToken } from '../../../../lib/server/token';
import { recordAudit } from '../../../../lib/server/audit';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });
  }

  // Always return 200 — enumeration resistance.
  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.status === 'ACTIVE') {
    const { tokenHash } = generateToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
    });
    await recordAudit({
      actorUserId: user.id,
      action: 'user.password_reset_requested',
      targetType: 'User',
      targetId: user.id,
    });
  }

  return NextResponse.json({ ok: true });
}
