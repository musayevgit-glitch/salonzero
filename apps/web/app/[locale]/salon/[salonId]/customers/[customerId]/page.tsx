'use client';

import {
  Badge,
  Breadcrumbs,
  Card,
  ErrorState,
  PermissionDeniedState,
  Skeleton,
} from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '../../../../../../lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerReservation {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  priceAmount: number;
  currency: string;
  serviceName: string;
  employeeName: string;
}

interface CustomerDetail {
  id: string;
  fullName: string;
  email: string;
  stats: {
    totalVisits: number;
    completed: number;
    cancelled: number;
    noShows: number;
    totalReservations: number;
  };
  reservations: CustomerReservation[];
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; customer: CustomerDetail };

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED_BY_CUSTOMER: 'Cancelled (customer)',
  CANCELLED_BY_SALON: 'Cancelled (salon)',
  NO_SHOW: 'No-show',
};

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100);
}

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const router = useRouter();
  const { salonId, customerId } = useParams<{ salonId: string; customerId: string }>();
  const t = useTranslations('salonAdmin');
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    apiFetch<CustomerDetail>(`/salons/${salonId}/customers/${customerId}`)
      .then((customer) => setState({ kind: 'ready', customer }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/salon/${salonId}/customers/${customerId}`);
          return;
        }
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
          setState({ kind: 'permission-denied' });
          return;
        }
        setState({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong.',
        });
      });
  }, [salonId, customerId, router]);

  if (state.kind === 'loading') {
    return (
      <main className="dashboard-page">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full max-w-lg" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (state.kind === 'permission-denied')
    return (
      <main className="dashboard-page">
        <PermissionDeniedState />
      </main>
    );
  if (state.kind === 'error') {
    return (
      <main className="dashboard-page">
        <ErrorState title={t('customers.errorLoadOne')} description={state.message} />
      </main>
    );
  }

  const { customer } = state;

  return (
    <main className="dashboard-page">
      <Breadcrumbs
        items={[
          { label: t('customers.title'), href: `/salon/${salonId}/customers` },
          { label: customer.fullName },
        ]}
      />

      {/* Profile card */}
      <Card className="max-w-lg">
        <h1 className="text-xl font-semibold text-text-primary">{customer.fullName}</h1>
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex flex-wrap justify-between gap-x-4">
            <dt className="text-text-secondary">{t('customers.email')}</dt>
            <dd className="break-all">{customer.email}</dd>
          </div>
        </dl>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 max-w-lg sm:grid-cols-4">
        <StatMini label={t('customers.totalVisits')} value={customer.stats.completed} />
        <StatMini label={t('customers.completed')} value={customer.stats.completed} color="var(--color-success)" />
        <StatMini label={t('customers.cancelled')} value={customer.stats.cancelled} color="#d97706" />
        <StatMini label={t('customers.noShows')} value={customer.stats.noShows} color="#dc2626" />
      </div>

      {/* Reservation history */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-4">
          {t('customers.reservationHistory')}
          <span className="ml-2 text-sm font-normal text-text-secondary">
            ({customer.reservations.length})
          </span>
        </h2>

        {customer.reservations.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('customers.noReservationsFound')}</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {customer.reservations.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{r.serviceName}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {formatDatetime(r.startAt)} · {r.employeeName}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-text-secondary">
                    {formatMoney(r.priceAmount, r.currency)}
                  </span>
                  <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}

function StatMini({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Card>
      <p className="text-xs text-text-secondary">{label}</p>
      <p
        className="mt-1 text-2xl font-bold text-text-primary"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </Card>
  );
}
