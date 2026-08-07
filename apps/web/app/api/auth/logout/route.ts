import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest } from '../../../../lib/server/auth';
import { recordAudit } from '../../../../lib/server/audit';

export async function POST(req: NextRequest) {
  const user = verifyRequest(req);
  if (user) {
    await recordAudit({ actorUserId: user.sub, action: 'user.logout', targetType: 'User', targetId: user.sub });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('token', '', { httpOnly: true, maxAge: 0, path: '/' });
  return res;
}
