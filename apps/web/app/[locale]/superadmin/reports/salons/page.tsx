'use client';

import { Badge, EmptyState, Link, Pagination, Skeleton, Table } from '@salonomia/ui';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface SalonRow {
  salonId: string;
  salonName: string;
  status: string;
  city: string | null;
  activeStylists: number;
  activeServices: number;
  totalReservations: number;
  cancelledCount: number;
  noShowCount: number;
  cancellationRate: number;
  noShowRate: number;
  revenue: number;
  currency: string;
  confirmedCount: number;
}
interface Response {
  items: SalonRow[];
  total: number;
  page: number;
  pageSize: number;
  from: string;
  to: string;
}

const TODAY = new Date().toISOString().slice(0, 10);

function fmt(cents: number, cur: string) {
  return new Intl.NumberFormat('az-AZ', { style: 'currency', currency: cur }).format(cents / 100);
}

export default function ReportsSalonsPage() {
  const [from, setFrom] = useState(() =>
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(TODAY);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    apiFetch<Response>(`/superadmin/reports/salons?from=${from}&to=${to}&page=${page}&pageSize=20`)
      .then((r) => {
        setData(r);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Yüklənmədi');
        setLoading(false);
      });
  }

  useEffect(load, [from, to, page]);

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <main className="dashboard-page">
      <div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Salon Hesabatları</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Hər salon üzrə performans
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => {
            setPage(1);
            setFrom(e.target.value);
          }}
          style={{
            padding: '0.4rem 0.6rem',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            background: 'var(--color-surface)',
          }}
        />
        <span>–</span>
        <input
          type="date"
          value={to}
          min={from}
          max={TODAY}
          onChange={(e) => {
            setPage(1);
            setTo(e.target.value);
          }}
          style={{
            padding: '0.4rem 0.6rem',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem',
            background: 'var(--color-surface)',
          }}
        />
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '0.4rem 0.9rem',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Yüklənir…' : 'Tətbiq et'}
        </button>
      </div>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {loading && !data ? (
        <Skeleton className="h-64 w-full" />
      ) : data?.items.length === 0 ? (
        <EmptyState
          title="Məlumat yoxdur"
          description="Seçilmiş dövrdə salon məlumatı tapılmadı."
        />
      ) : data ? (
        <>
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={[
                {
                  key: 'salon',
                  header: 'Salon',
                  render: (r: SalonRow) => (
                    <Link href={`/superadmin/salons/${r.salonId}`}>{r.salonName}</Link>
                  ),
                },
                { key: 'city', header: 'Şəhər', render: (r: SalonRow) => r.city ?? '—' },
                {
                  key: 'status',
                  header: 'Status',
                  render: (r: SalonRow) => (
                    <Badge tone={r.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {r.status === 'ACTIVE' ? 'Aktiv' : 'Deaktiv'}
                    </Badge>
                  ),
                },
                {
                  key: 'stylists',
                  header: 'Aktiv stilist',
                  render: (r: SalonRow) => r.activeStylists,
                },
                {
                  key: 'services',
                  header: 'Aktiv xidmət',
                  render: (r: SalonRow) => r.activeServices,
                },
                {
                  key: 'reservations',
                  header: 'Rezervasiya',
                  render: (r: SalonRow) => r.totalReservations,
                },
                {
                  key: 'cancelled',
                  header: 'Ləğv',
                  render: (r: SalonRow) =>
                    `${r.cancelledCount} (${(r.cancellationRate * 100).toFixed(0)}%)`,
                },
                {
                  key: 'noshow',
                  header: 'Gəlməyən',
                  render: (r: SalonRow) => `${r.noShowCount} (${(r.noShowRate * 100).toFixed(0)}%)`,
                },
                {
                  key: 'revenue',
                  header: 'Gəlir',
                  render: (r: SalonRow) => fmt(r.revenue, r.currency),
                },
              ]}
              rows={data.items}
              getRowKey={(r) => r.salonId}
            />
          </div>
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      ) : null}
    </main>
  );
}
