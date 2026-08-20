'use client';

import { Badge, EmptyState, Link, Pagination, Select, Skeleton, Table } from '@salonomia/ui';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface Salon {
  id: string;
  name: string;
}
interface ReservationItem {
  id: string;
  status: string;
  startAt: string;
  priceAmount: number;
  currency: string;
  customerName: string;
  salonId: string;
  salonName: string;
  serviceId: string;
  serviceName: string;
  employeeId: string;
  employeeName: string;
}
interface Response {
  items: ReservationItem[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Gözləyir',
  CONFIRMED: 'Təsdiqlənib',
  REJECTED: 'Rədd edilib',
  CANCELLED_BY_CUSTOMER: 'Müştəri ləğv',
  CANCELLED_BY_SALON: 'Salon ləğv',
  CHECKED_IN: 'Gəldi',
  COMPLETED: 'Tamamlandı',
  NO_SHOW: 'Gəlmədi',
};
const STATUS_TONE: Record<string, 'success' | 'neutral' | 'danger' | 'warning'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  REJECTED: 'danger',
  CANCELLED_BY_CUSTOMER: 'danger',
  CANCELLED_BY_SALON: 'danger',
  CHECKED_IN: 'success',
  COMPLETED: 'success',
  NO_SHOW: 'neutral',
};
const TODAY = new Date().toISOString().slice(0, 10);
function fmt(cents: number, cur: string) {
  return new Intl.NumberFormat('az-AZ', { style: 'currency', currency: cur }).format(cents / 100);
}

export default function ReportsReservationsPage() {
  const [from, setFrom] = useState(() =>
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(TODAY);
  const [salonFilter, setSalonFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
    if (statusFilter) q.set('status', statusFilter);
    apiFetch<Response>(`/superadmin/reservations?${q}`)
      .then((r) => {
        setData(r);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Yüklənmədi');
        setLoading(false);
      });
  }

  useEffect(load, [from, to, salonFilter, statusFilter, page]);
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <main className="dashboard-page">
      <div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Rezervasiya Hesabatları</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
          Bütün salonlar üzrə rezervasiya analitikası
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
        <Select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          style={{ maxWidth: 180 }}
        >
          <option value="">Bütün statuslar</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
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
        <EmptyState title="Rezervasiya tapılmadı" description="Filtr dəyişdirin." />
      ) : data ? (
        <>
          <Table
            columns={[
              {
                key: 'date',
                header: 'Tarix',
                render: (r: ReservationItem) =>
                  new Date(r.startAt).toLocaleString('az-AZ', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }),
              },
              {
                key: 'customer',
                header: 'Müştəri',
                render: (r: ReservationItem) => r.customerName,
              },
              {
                key: 'salon',
                header: 'Salon',
                render: (r: ReservationItem) => (
                  <Link href={`/superadmin/salons/${r.salonId}`}>{r.salonName}</Link>
                ),
              },
              {
                key: 'service',
                header: 'Xidmət',
                render: (r: ReservationItem) => (
                  <Link href={`/superadmin/services/${r.serviceId}`}>{r.serviceName}</Link>
                ),
              },
              {
                key: 'employee',
                header: 'Stilist',
                render: (r: ReservationItem) => (
                  <Link href={`/superadmin/stylists/${r.employeeId}`}>{r.employeeName}</Link>
                ),
              },
              {
                key: 'price',
                header: 'Məbləğ',
                render: (r: ReservationItem) => fmt(r.priceAmount, r.currency),
              },
              {
                key: 'status',
                header: 'Status',
                render: (r: ReservationItem) => (
                  <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </Badge>
                ),
              },
            ]}
            rows={data.items}
            getRowKey={(r) => r.id}
          />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      ) : null}
    </main>
  );
}
