import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/server/prisma';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ holdId: string }> },
) {
  const { holdId } = await params;

  // UUID format check
  if (!/^[0-9a-f-]{36}$/i.test(holdId)) {
    return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  }

  await prisma.slotHold.deleteMany({ where: { id: holdId } });

  return new NextResponse(null, { status: 204 });
}
