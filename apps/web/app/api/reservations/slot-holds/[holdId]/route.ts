import { NextRequest, NextResponse } from 'next/server';
import { verifyRequest, unauthorized } from '../../../../../lib/server/auth';
import { prisma } from '../../../../../lib/server/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ holdId: string }> },
) {
  const auth = verifyRequest(req);
  if (!auth) return unauthorized();

  const { holdId } = await params;

  // UUID format check
  if (!/^[0-9a-f-]{36}$/i.test(holdId)) {
    return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  }

  // Scoped by owner in the same statement — never "look up by id, then authorize". Deleting
  // someone else's hold would hand an attacker a way to free slots they do not own.
  await prisma.slotHold.deleteMany({ where: { id: holdId, heldByUserId: auth.sub } });

  return new NextResponse(null, { status: 204 });
}
