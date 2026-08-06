import { Injectable } from '@nestjs/common';
import { ReservationStatus } from '@salonomia/database';
import type { SalonReportQuery, AuditLogQuery } from '@salonomia/validation';
import { PrismaService } from '../prisma/prisma.service';

const REVENUE_STATUSES: ReservationStatus[] = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.CHECKED_IN,
  ReservationStatus.COMPLETED,
];

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // Convert a YYYY-MM-DD string in the salon's timezone to UTC range [dayStart, dayEnd].
  // We store start/end as UTC, so we query the UTC day boundaries that contain the local range.
  // For simplicity: treat from/to as UTC days (conservatively wide — never leaks another tenant's data).
  private toUtcRange(from: string, to: string) {
    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T23:59:59.999Z`);
    return { start, end };
  }

  async salonReport(salonId: string, query: SalonReportQuery) {
    const { start, end } = this.toUtcRange(query.from, query.to);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        salonId,
        startAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        status: true,
        startAt: true,
        priceAmount: true,
        currency: true,
        service: { select: { name: true } },
      },
      orderBy: { startAt: 'asc' },
    });

    const total = reservations.length;
    const byStatus = reservations.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});

    // Revenue: sum of priceAmount for CONFIRMED, CHECKED_IN, COMPLETED reservations only.
    // Group by currency since a salon could theoretically change currency over time.
    const revenueMap = new Map<string, number>();
    for (const r of reservations) {
      if (REVENUE_STATUSES.includes(r.status as ReservationStatus)) {
        revenueMap.set(r.currency, (revenueMap.get(r.currency) ?? 0) + r.priceAmount);
      }
    }
    const revenue = Object.fromEntries(revenueMap);

    // Daily counts for a simple time-series
    const byDay = reservations.reduce<Record<string, number>>((acc, r) => {
      const day = r.startAt.toISOString().slice(0, 10);
      acc[day] = (acc[day] ?? 0) + 1;
      return acc;
    }, {});

    // Top services by reservation count
    const byService = reservations.reduce<Record<string, number>>((acc, r) => {
      const name = r.service.name;
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {});
    const topServices = Object.entries(byService)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return { total, byStatus, revenue, byDay, topServices, from: query.from, to: query.to };
  }

  async globalReport(query: SalonReportQuery) {
    const { start, end } = this.toUtcRange(query.from, query.to);

    const [total, byStatus, salonRows] = await Promise.all([
      this.prisma.reservation.count({ where: { startAt: { gte: start, lte: end } } }),
      this.prisma.reservation.groupBy({
        by: ['status'],
        where: { startAt: { gte: start, lte: end } },
        _count: { id: true },
      }),
      this.prisma.reservation.groupBy({
        by: ['salonId', 'currency'],
        where: {
          status: { in: REVENUE_STATUSES },
          startAt: { gte: start, lte: end },
        },
        _sum: { priceAmount: true },
        _count: { id: true },
      }),
    ]);

    const salonIds = [...new Set(salonRows.map((r) => r.salonId))];
    const salons = await this.prisma.salon.findMany({
      where: { id: { in: salonIds } },
      select: { id: true, name: true, slug: true },
    });
    const salonMap = Object.fromEntries(salons.map((s) => [s.id, s]));

    const byStatusMap = Object.fromEntries(byStatus.map((r) => [r.status, r._count.id]));

    const bySalon = salonRows.map((r) => ({
      salon: salonMap[r.salonId] ?? { id: r.salonId, name: 'Unknown', slug: '' },
      currency: r.currency,
      confirmedCount: r._count.id,
      confirmedRevenue: r._sum.priceAmount ?? 0,
    }));

    return { total, byStatus: byStatusMap, bySalon, from: query.from, to: query.to };
  }

  async auditLogs(salonId: string | null, query: AuditLogQuery) {
    const where = {
      ...(salonId ? { salonId } : {}),
      ...(query.action ? { action: { contains: query.action } } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Resolve actor user emails for display — only expose email, no password hash.
    const actorIds = [...new Set(items.map((l) => l.actorUserId).filter(Boolean))] as string[];
    const actors =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, email: true, fullName: true },
          })
        : [];
    const actorMap = Object.fromEntries(actors.map((a) => [a.id, a]));

    return {
      items: items.map((l) => ({
        ...l,
        actor: l.actorUserId ? (actorMap[l.actorUserId] ?? null) : null,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
