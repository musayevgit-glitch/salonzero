'use client';

import { Badge, Button, Card, EmptyState, Skeleton } from '@salonomia/ui';
import NextLink from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '../../../../lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  total: number;
  byStatus: Record<string, number>;
  revenue: Record<string, number>;
}

interface UpcomingReservation {
  id: string;
  status: string;
  startAt: string;
  guestName: string | null;
  customer: { email: string } | null;
  service: { id: string; name: string };
  employee: { id: string; fullName: string };
}

interface ReservationListResponse {
  items: UpcomingReservation[];
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTomorrow(): string {
  const tomorrow = new Date(Date.now() + 86_400_000);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CHECKED_IN: 'success',
  COMPLETED: 'neutral',
  REJECTED: 'danger',
  CANCELLED_BY_CUSTOMER: 'danger',
  CANCELLED_BY_SALON: 'danger',
  NO_SHOW: 'danger',
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  PENDING: 'reservations.statusPending',
  CONFIRMED: 'reservations.statusConfirmed',
  CHECKED_IN: 'reservations.statusCheckedIn',
  COMPLETED: 'reservations.statusCompleted',
  REJECTED: 'reservations.statusCancelled',
  CANCELLED_BY_CUSTOMER: 'reservations.statusCancelled',
  CANCELLED_BY_SALON: 'reservations.statusCancelled',
  NO_SHOW: 'reservations.statusNoShow',
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accentColor,
}: {
  label: string;
  value: number;
  accentColor?: string;
}) {
  return (
    <Card>
      <p className="text-xs text-text-secondary">{label}</p>
      <p
        className="mt-1 text-3xl font-bold text-text-primary"
        style={accentColor ? { color: accentColor } : undefined}
      >
        {value}
      </p>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalonDashboardPage() {
  const t = useTranslations('salonAdmin');
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();
  const today = getToday();
  const tomorrow = getTomorrow();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingReservation[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    // Today's summary from reports endpoint
    apiFetch<DashboardStats>(`/salons/${salonId}/reports?from=${today}&to=${today}`)
      .then((r) => setStats(r))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/salon/${salonId}`);
          return;
        }
        setStatsError(err instanceof ApiError ? err.message : 'Failed to load stats');
      })
      .finally(() => setLoadingStats(false));

    // Today's upcoming reservations
    apiFetch<ReservationListResponse>(
      `/salons/${salonId}/reservations?from=${today}&to=${tomorrow}&pageSize=5`,
    )
      .then((r) => setUpcoming(r.items))
      .catch(() => {})
      .finally(() => setLoadingUpcoming(false));
  }, [salonId, today, tomorrow, router]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t('dashboard.greetingMorning') : hour < 17 ? t('dashboard.greetingAfternoon') : t('dashboard.greetingEvening');

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{greeting}</h1>
        <p className="mt-1 text-sm text-text-secondary">{dateLabel}</p>
      </div>

      {/* ── Today's stats ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
          {t('dashboard.todayAtAGlance')}
        </h2>
        {loadingStats ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-[var(--radius-lg)]" />
            ))}
          </div>
        ) : statsError ? (
          <p className="text-sm text-destructive">{statsError}</p>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label={t('dashboard.totalReservations')} value={stats.total} />
            <StatCard
              label={t('dashboard.confirmed')}
              value={(stats.byStatus['CONFIRMED'] ?? 0) + (stats.byStatus['CHECKED_IN'] ?? 0)}
              accentColor="var(--color-success, #16a34a)"
            />
            <StatCard
              label={t('dashboard.completedToday')}
              value={stats.byStatus['COMPLETED'] ?? 0}
            />
            <StatCard
              label={t('dashboard.pendingApproval')}
              value={stats.byStatus['PENDING'] ?? 0}
              accentColor="var(--color-warning, #d97706)"
            />
          </div>
        ) : null}
      </section>

      {/* ── Upcoming reservations ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            {t('dashboard.todayAppointments')}
          </h2>
          <NextLink
            href={`/salon/${salonId}/reservations`}
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-accent)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            {t('dashboard.viewAll')} →
          </NextLink>
        </div>

        {loadingUpcoming ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[4.5rem] rounded-[var(--radius-lg)]" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <EmptyState
            title={t('dashboard.noAppointmentsToday')}
            description={t('dashboard.noAppointmentsTodayDesc')}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map((r) => (
              <NextLink
                key={r.id}
                href={`/salon/${salonId}/reservations/${r.id}`}
                style={{ textDecoration: 'none' }}
              >
                <Card
                  style={{ cursor: 'pointer', transition: 'box-shadow 0.15s ease' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Time block */}
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          color: 'var(--color-text-primary)',
                          flexShrink: 0,
                          minWidth: '3.5rem',
                        }}
                      >
                        {formatTime(r.startAt)}
                      </div>
                      {/* Details */}
                      <div style={{ minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.customer?.email ?? r.guestName ?? 'Guest'}
                        </p>
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.service.name} · {r.employee.fullName}
                        </p>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>
                        {STATUS_LABEL_KEYS[r.status] ? t(STATUS_LABEL_KEYS[r.status]!) : r.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </NextLink>
            ))}
          </div>
        )}
      </section>

      {/* ── Quick actions ── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
          {t('dashboard.quickActions')}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => router.push(`/salon/${salonId}/reservations/new`)}>
            {t('dashboard.newReservation')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push(`/salon/${salonId}/employees/new`)}
          >
            {t('dashboard.addEmployee')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push(`/salon/${salonId}/services/new`)}
          >
            {t('dashboard.addService')}
          </Button>
        </div>
      </section>
    </div>
  );
}
