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
  const salonId = searchParams.get('salonId') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '20'));

  const where: Prisma.EmployeeProfileWhereInput = {};

  if (search) {
    where.fullName = { contains: search, mode: 'insensitive' };
  }
  if (salonId) {
    where.salonId = salonId;
  }
  if (status === 'ACTIVE') {
    where.isActive = true;
  } else if (status === 'INACTIVE') {
    where.isActive = false;
  }

  const [items, total] = await Promise.all([
    prisma.employeeProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        fullName: true,
        bio: true,
        photoUrl: true,
        isActive: true,
        createdAt: true,
        salon: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.employeeProfile.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((e) => ({
      id: e.id,
      fullName: e.fullName,
      bio: e.bio,
      photoUrl: e.photoUrl,
      isActive: e.isActive,
      createdAt: e.createdAt,
      salonId: e.salon.id,
      salonName: e.salon.name,
    })),
    total,
    page,
    pageSize,
  });
}
