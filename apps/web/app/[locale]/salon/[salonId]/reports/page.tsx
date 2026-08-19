'use client';

import { Button, Card, FormField, Input, Skeleton, Table } from '@salonomia/ui';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '../../../../../lib/api-client';
import { PageHeader } from '../../../../_components/admin/PageHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SalonReport {
  from: string;
  to: string;
  total: number;
  byStatus: Record<string, number>;
  revenue: Record<string, number>;
  byDay: Record<string, number>;
  topServices: { name: string; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

function firstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100);
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  COMPLETED: 'Completed',
  CANCELLED_BY_CUSTOMER: 'Cancelled (customer)',
  CANCELLED_BY_SALON: 'Cancelled (salon)',
  REJECTED: 'Rejected',
  NO_SHOW: 'No show',
};

// ─── Components ───────────────────────────────────────────────────────────────

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalonReportsPage() {
  const { salonId } = useParams<{ salonId: string }>();
  const t = useTranslations('salonAdmin');
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(getToday());
  const [report, setReport] = useState<SalonReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PRESETS = [
    { label: t('reports.today'), from: () => getToday(), to: () => getToday() },
    { label: t('reports.last7Days'), from: () => daysAgo(6), to: () => getToday() },
    { label: t('reports.last30Days'), from: () => daysAgo(29), to: () => getToday() },
    { label: t('reports.thisMonth'), from: () => firstDayOfMonth(), to: () => getToday() },
  ];

  function load(f = from, t2 = to) {
    setLoading(true);
    setError(null);
    apiFetch<SalonReport>(`/salons/${salonId}/reports?from=${f}&to=${t2}`)
      .then((r) => setReport(r))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load report.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function applyPreset(preset: (typeof PRESETS)[0]) {
    const f = preset.from();
    const t2 = preset.to();
    setFrom(f);
    setTo(t2);
    load(f, t2);
  }

  const today = getToday();

  // Build day rows for Table
  interface DayRow { day: string; count: number }
  const dayRows: DayRow[] = report
    ? Object.entries(report.byDay).map(([day, count]) => ({ day, count }))
    : [];

  return (
    <main className="dashboard-page">
      <PageHeader title={t('reports.title')} />

      {/* Controls */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const isActive = from === preset.from() && to === preset.to();
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    padding: '0.3125rem 0.75rem',
                    borderRadius: '9999px',
                    border: '1px solid var(--color-border)',
                    background: isActive ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: isActive ? '#fff' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease, color 0.12s ease',
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom date range */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <FormField label={t('reports.from')}>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                />
              )}
            </FormField>
            <FormField label={t('reports.to')}>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="date"
                  value={to}
                  min={from}
                  max={today}
                  onChange={(e) => setTo(e.target.value)}
                />
              )}
            </FormField>
            <Button type="submit" loading={loading} disabled={loading}>
              {t('reports.apply')}
            </Button>
          </form>
        </div>
      </Card>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {/* Skeleton */}
      {loading && !report ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : null}

      {report ? (
        <div
          className="flex flex-col gap-6"
          style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s ease' }}
        >
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label={t('reports.totalReservations')} value={String(report.total)} />
            {Object.entries(report.revenue).map(([currency, amount]) => (
              <KpiCard
                key={currency}
                label={t('reports.revenueWithCurrency').replace('{currency}', currency)}
                value={formatMoney(amount, currency)}
              />
            ))}
            <KpiCard label={t('reports.completed')} value={String(report.byStatus['COMPLETED'] ?? 0)} />
            <KpiCard
              label={t('reports.cancellations')}
              value={String(
                (report.byStatus['CANCELLED_BY_CUSTOMER'] ?? 0) +
                  (report.byStatus['CANCELLED_BY_SALON'] ?? 0),
              )}
            />
          </div>

          {/* Status breakdown */}
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-text-primary">{t('reports.byStatus')}</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {Object.entries(report.byStatus).map(([status, count]) => (
                <div key={status}>
                  <dt className="text-xs text-text-secondary">{STATUS_LABEL[status] ?? status}</dt>
                  <dd className="mt-0.5 text-lg font-bold text-text-primary">{count}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Top services */}
          {report.topServices.length > 0 ? (
            <Card>
              <h2 className="mb-4 text-sm font-semibold text-text-primary">{t('reports.topServices')}</h2>
              <div className="flex flex-col gap-3">
                {report.topServices.map((s, i) => {
                  const max = report.topServices[0]?.count ?? 1;
                  const pct = Math.round((s.count / max) * 100);
                  return (
                    <div key={s.name} className="flex items-center gap-3 text-sm">
                      <span className="w-5 text-right text-text-secondary shrink-0">{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex justify-between gap-2 mb-1">
                          <span className="truncate text-text-primary">{s.name}</span>
                          <span className="text-text-secondary font-medium shrink-0">{s.count}</span>
                        </div>
                        <div
                          style={{
                            height: '4px',
                            borderRadius: '9999px',
                            background: 'var(--color-border)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: 'var(--color-accent)',
                              borderRadius: '9999px',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}

          {/* Daily breakdown */}
          {dayRows.length > 0 ? (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <h2 className="px-5 py-4 text-sm font-semibold text-text-primary border-b border-border">
                {t('reports.dailyReservations')}
              </h2>
              <Table<DayRow>
                columns={[
                  { key: 'date', header: t('reports.date'), render: (row) => <span>{row.day}</span> },
                  {
                    key: 'count',
                    header: t('reports.reservations'),
                    render: (row) => <span className="font-medium">{row.count}</span>,
                  },
                ]}
                rows={dayRows}
                getRowKey={(row) => row.day}
              />
              {/* Mobile fallback — Table hides on mobile */}
              <div className="md:hidden divide-y divide-border">
                {dayRows.map((row) => (
                  <div key={row.day} className="flex justify-between px-5 py-3 text-sm">
                    <span className="text-text-secondary">{row.day}</span>
                    <span className="font-medium">{row.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
