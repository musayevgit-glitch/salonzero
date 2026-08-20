'use client';

import { EmptyState, Link, Pagination, Select, Skeleton, Table } from '@salonomia/ui';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface Salon {
  id: string;
  name: string;
}
interface CustomerRow {
  customerId: string;
  fullName: string;
  email: string;
  phone: string | null;
  memberSince: string | null;
  bookingCount: number;
}
interface Summary {
  totalAllTime: number;
  uniqueInPeriod: number;
  newInPeriod: number;
  returningInPeriod: number;
}
interface Response {
  items: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
  summary: Summary;
}

const TODAY = new Date().toISOString().slice(0, 10);

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem 1.25rem',
      }}
    >
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>
        {label}
      </p>
      <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.25rem 0 0' }}>{value}</p>
    </div>
  );
}

export default function ReportsCustomersPage() {
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
    apiFetch<Response>(`/superadmin/reports/customers?${q}`)
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
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Müştəri Hesabatları</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Müştəri aktivliyi və statistika
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

      {data?.summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <StatCard label="Cəmi müştərilər" value={data.summary.totalAllTime} />
          <StatCard label="Dövrdə unikal" value={data.summary.uniqueInPeriod} />
          <StatCard label="Yeni qeydiyyat" value={data.summary.newInPeriod} />
          <StatCard label="Dəfələrlə gələn" value={data.summary.returningInPeriod} />
        </div>
      )}

      {loading && !data ? (
        <Skeleton className="h-64 w-full" />
      ) : data?.items.length === 0 ? (
        <EmptyState
          title="Müştəri tapılmadı"
          description="Seçilmiş dövrdə müştəri məlumatı yoxdur."
        />
      ) : data ? (
        <>
          <Table
            columns={[
              {
                key: 'name',
                header: 'Müştəri',
                render: (r: CustomerRow) => (
                  <div>
                    <div style={{ fontWeight: 500 }}>{r.fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      {r.email}
                    </div>
                  </div>
                ),
              },
              { key: 'phone', header: 'Telefon', render: (r: CustomerRow) => r.phone ?? '—' },
              {
                key: 'since',
                header: 'Qeydiyyat',
                render: (r: CustomerRow) =>
                  r.memberSince ? new Date(r.memberSince).toLocaleDateString('az-AZ') : '—',
              },
              {
                key: 'bookings',
                header: 'Rezervasiya',
                render: (r: CustomerRow) => <strong>{r.bookingCount}</strong>,
              },
            ]}
            rows={data.items}
            getRowKey={(r) => r.customerId}
          />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      ) : null}
    </main>
  );
}
