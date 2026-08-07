import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordSchema } from '@salonomia/validation';
import { prisma } from '../../../../lib/server/prisma';
import { hashPassword } from '../../../../lib/server/password';
import { hashToken } from '../../../../lib/server/token';
import { recordAudit } from '../../../../lib/server/audit';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ message: 'This reset link is invalid or has expired.' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  });

  await recordAudit({ actorUserId: record.userId, action: 'user.password_reset', targetType: 'User', targetId: record.userId });

  return NextResponse.json({ ok: true });
}
