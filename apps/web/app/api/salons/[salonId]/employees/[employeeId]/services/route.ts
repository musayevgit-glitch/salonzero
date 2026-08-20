import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../../lib/server/prisma';
import {
  getSalonContext,
  isSalonContextError,
} from '../../../../../../../lib/server/salon-context';
import { notFound } from '../../../../../../../lib/server/auth';
import { z } from 'zod';

async function resolveEmployee(salonId: string, employeeId: string) {
  const emp = await prisma.employeeProfile.findUnique({
    where: { id: employeeId },
    select: { id: true, salonId: true },
  });
  if (!emp || emp.salonId !== salonId) return null;
  return emp;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string }> },
) {
  const { salonId, employeeId } = await params;
  const ctx = await getSalonContext(req, salonId);
  if (isSalonContextError(ctx)) return ctx;

  const emp = await resolveEmployee(salonId, employeeId);
  if (!emp) return notFound();

  const rows = await prisma.employeeService.findMany({
    where: { employeeId },
    select: { service: { select: { id: true, name: true } } },
    orderBy: { service: { name: 'asc' } },
  });

  return NextResponse.json(rows.map((r) => r.service));
}

const assignBody = z.object({ serviceId: z.string().uuid() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ salonId: string; employeeId: string }> },
) {
  const { salonId, employeeId } = await params;
  const ctx = await getSalonContext(req, salonId, 'SALON_ADMIN');
  if (isSalonContextError(ctx)) return ctx;

  const emp = await resolveEmployee(salonId, employeeId);
  if (!emp) return notFound();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON.' }, { status: 400 });
  }
  const parsed = assignBody.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ message: 'serviceId required.' }, { status: 400 });

  const service = await prisma.service.findUnique({
    where: { id: parsed.data.serviceId },
    select: { id: true, salonId: true },
  });
  if (!service || service.salonId !== salonId) return notFound();

  const existing = await prisma.employeeService.findFirst({
    where: { employeeId, serviceId: parsed.data.serviceId },
  });
  if (existing) return NextResponse.json({ message: 'Already assigned.' }, { status: 409 });

  await prisma.employeeService.create({ data: { employeeId, serviceId: parsed.data.serviceId } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
