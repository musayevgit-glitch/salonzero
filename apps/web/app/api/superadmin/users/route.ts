import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/server/prisma';
import { requireSuperadmin } from '../../../../lib/server/salon-context';
import { Prisma } from '@salonomia/database';

export async function GET(req: NextRequest) {
  const superadminCheck = requireSuperadmin(req);
  if (superadminCheck instanceof NextResponse) return superadminCheck;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const role = searchParams.get('role') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '20'));

  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { fullName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status === 'ACTIVE' || status === 'SUSPENDED') {
    where.status = status;
  }

  if (role === 'SUPERADMIN') {
    where.isSuperadmin = true;
  } else if (role === 'STYLIST') {
    where.employeeProfile = { isNot: null };
  } else if (role === 'CUSTOMER') {
    where.isSuperadmin = false;
    where.employeeProfile = null;
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        status: true,
        isSuperadmin: true,
        createdAt: true,
        employeeProfile: {
          select: {
            id: true,
            salon: { select: { name: true } },
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      status: u.status,
      isSuperadmin: u.isSuperadmin,
      createdAt: u.createdAt,
      isStylist: !!u.employeeProfile,
      salonName: u.employeeProfile?.salon.name ?? null,
    })),
    total,
    page,
    pageSize,
  });
}
