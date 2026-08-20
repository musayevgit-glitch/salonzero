'use client';

import { EmptyState, Link, Pagination, Select, Skeleton, Table } from '@salonomia/ui';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface Salon {
  id: string;
  name: string;
}
interface StylistRow {
  employeeId: string;
  fullName: string;
  isActive: boolean;
  photoUrl: string | null;
  salonId: string;
  salonName: string;
  totalReservations: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  revenue: number;
  currency: string;
}
interface Response {
  items: StylistRow[];
  total: number;
  page: number;
  pageSize: number;
}

const TODAY = new Date().toISOString().slice(0, 10);
function fmt(cents: number, cur: string) {
  return new Intl.NumberFormat('az-AZ', { style: 'currency', currency: cur }).format(cents / 100);
}

export default function ReportsStylistsPage() {
  const [from, setFrom] = useState(() =>
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(TODAY);
  const [salonFilter, setSalonFilter] = useState('');
  const [salons, setSalons] = useState<Salon[]>([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ items: Salon[] }>('/salons?pageSize=200')
      .then((r) => setSalons(r.items))
      .catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({ from, to, page: String(page), pageSize: '20' });
    if (salonFilter) q.set('salonId', salonFilter);
    apiFetch<Response>(`/superadmin/reports/stylists?${q}`)
      .then((r) => {
        setData(r);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Yüklənmədi');
        setLoading(false);
      });
  }

  useEffect(load, [from, to, salonFilter, page]);
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <main className="dashboard-page">
      <div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Stilist Hesabatları</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Hər stilist üzrə performans
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
        <Select
          value={salonFilter}
          onChange={(e) => {
            setPage(1);
            setSalonFilter(e.target.value);
          }}
          style={{ maxWidth: 180 }}
        >
          <option value="">Bütün salonlar</option>
          {salons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
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
          description="Seçilmiş dövrdə stilist məlumatı tapılmadı."
        />
      ) : data ? (
        <>
          <Table
            columns={[
              {
                key: 'name',
                header: 'Stilist',
                render: (r: StylistRow) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--color-accent-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: 'var(--color-accent)',
                        fontSize: '0.8rem',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}
                    >
                      {r.photoUrl ? (
                        <img
                          src={r.photoUrl}
                          alt={r.fullName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        r.fullName.slice(0, 1)
                      )}
                    </div>
                    <Link href={`/superadmin/stylists/${r.employeeId}`}>{r.fullName}</Link>
                  </div>
                ),
              },
              {
                key: 'salon',
                header: 'Salon',
                render: (r: StylistRow) => (
                  <Link href={`/superadmin/salons/${r.salonId}`}>{r.salonName}</Link>
                ),
              },
              {
                key: 'total',
                header: 'Rezervasiya',
                render: (r: StylistRow) => r.totalReservations,
              },
              {
                key: 'completed',
                header: 'Tamamlanan',
                render: (r: StylistRow) => r.completedCount,
              },
              { key: 'cancelled', header: 'Ləğv', render: (r: StylistRow) => r.cancelledCount },
              { key: 'noshow', header: 'Gəlməyən', render: (r: StylistRow) => r.noShowCount },
              {
                key: 'revenue',
                header: 'Gəlir',
                render: (r: StylistRow) => fmt(r.revenue, r.currency),
              },
            ]}
            rows={data.items}
            getRowKey={(r) => r.employeeId}
          />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      ) : null}
    </main>
  );
}
