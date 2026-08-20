'use client';

import { Badge, Button, EmptyState, Skeleton } from '@salonomia/ui';
import NextLink from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '../../../../lib/api-client';
import { PageHeader } from '../../../_components/admin/PageHeader';
import { SectionCard } from '../../../_components/admin/SectionCard';
import { StatCard } from '../../../_components/admin/StatCard';

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

// ─── Icons ────────────────────────────────────────────────────────────────────

const I = {
  width: 18,
  height: 18,
  viewBox: '0 0 20 20',
  fill: 'none',
  'aria-hidden': true as const,
};

function CalendarIcon() {
  return (
    <svg {...I}>
      <rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 2v3M14 2v3M2 8h16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg {...I}>
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 10.2l2.4 2.4L13.5 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg {...I}>
      <path d="M5 2.5V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M5 3.5h9l-2 3 2 3H5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg {...I}>
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6v4.3l2.8 1.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
    hour < 12
      ? t('dashboard.greetingMorning')
      : hour < 17
        ? t('dashboard.greetingAfternoon')
        : t('dashboard.greetingEvening');

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="dashboard-page">
      <PageHeader
        title={greeting}
        description={dateLabel}
        actions={
          <Button onClick={() => router.push(`/salon/${salonId}/reservations/new`)}>
            {t('dashboard.newReservation')}
          </Button>
        }
      />

      {/* ── Today's stats ── */}
      {loadingStats ? (
        <div className="stat-grid">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[5.5rem] rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : statsError ? (
        <div className="admin-card admin-card-body text-sm text-danger" role="alert">
          {statsError}
        </div>
      ) : stats ? (
        <section aria-label={t('dashboard.todayAtAGlance')} className="stat-grid">
          <StatCard
            label={t('dashboard.totalReservations')}
            value={stats.total}
            icon={<CalendarIcon />}
          />
          <StatCard
            label={t('dashboard.confirmed')}
            value={(stats.byStatus['CONFIRMED'] ?? 0) + (stats.byStatus['CHECKED_IN'] ?? 0)}
            tone="success"
            icon={<CheckIcon />}
          />
          <StatCard
            label={t('dashboard.completedToday')}
            value={stats.byStatus['COMPLETED'] ?? 0}
            tone="info"
            icon={<FlagIcon />}
          />
          <StatCard
            label={t('dashboard.pendingApproval')}
            value={stats.byStatus['PENDING'] ?? 0}
            tone="warning"
            icon={<ClockIcon />}
            sub={(stats.byStatus['PENDING'] ?? 0) > 0 ? t('dashboard.viewAll') : undefined}
          />
        </section>
      ) : null}

      {/* ── Upcoming reservations ── */}
      <SectionCard
        title={t('dashboard.todayAppointments')}
        headerAction={
          <NextLink
            href={`/salon/${salonId}/reservations`}
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-accent)',
              textDecoration: 'none',
            }}
          >
            {t('dashboard.viewAll')} →
          </NextLink>
        }
        padded={false}
      >
        {loadingUpcoming ? (
          <div className="flex flex-col gap-2 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 rounded-[var(--radius-sm)]" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={t('dashboard.noAppointmentsToday')}
              description={t('dashboard.noAppointmentsTodayDesc')}
            />
          </div>
        ) : (
          <ul className="m-0 list-none p-0">
            {upcoming.map((r, i) => (
              <li
                key={r.id}
                style={{ borderTop: i === 0 ? undefined : '1px solid var(--color-border)' }}
              >
                <NextLink
                  href={`/salon/${salonId}/reservations/${r.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 no-underline transition-colors hover:bg-surface"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <span
                      className="shrink-0 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm font-bold tabular-nums"
                      style={{
                        background: 'var(--color-accent-muted)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      {formatTime(r.startAt)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-text-primary">
                        {r.customer?.email ?? r.guestName ?? 'Guest'}
                      </span>
                      <span className="block truncate text-xs text-text-secondary">
                        {r.service.name} · {r.employee.fullName}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0">
                    <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>
                      {STATUS_LABEL_KEYS[r.status] ? t(STATUS_LABEL_KEYS[r.status]!) : r.status}
                    </Badge>
                  </span>
                </NextLink>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* ── Quick actions ── */}
      <SectionCard title={t('dashboard.quickActions')}>
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
          <Button variant="secondary" onClick={() => router.push(`/salon/${salonId}/services/new`)}>
            {t('dashboard.addService')}
          </Button>
        </div>
      </SectionCard>
    </main>
  );
}
