import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../../lib/server/prisma';
import { getSalonContext, isSalonContextError } from '../../../../../../../../lib/server/salon-context';
import { badRequest, notFound } from '../../../../../../../../lib/server/auth';
import { getStorageAdapter } from '../../../../../../../../lib/server/storage';
import { requestPortfolioUploadSchema } from '@salonomia/validation';
import { randomUUID } from 'node:crypto';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string }> }
) {
  const { salonId, employeeId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  const employee = await prisma.employeeProfile.findFirst({
    where: { id: employeeId, salonId },
    select: { id: true },
  });
  if (!employee) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = requestPortfolioUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid input.', errors: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const extension = EXTENSION_BY_MIME[input.mimeType];
  if (!extension) {
    return badRequest('Unsupported mimeType.');
  }

  const objectKey = `employees/${employeeId}/${randomUUID()}.${extension}`;
  const storage = getStorageAdapter();
  const target = await storage.createUploadTarget(
    objectKey,
    input.mimeType,
    input.sizeBytes
  );

  return NextResponse.json({ ...target, objectKey });
}
