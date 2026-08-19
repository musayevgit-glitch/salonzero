'use client';

import { Badge, EmptyState, Link, Pagination, Select, Skeleton, Table } from '@salonomia/ui';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface Salon { id: string; name: string; }
interface ServiceRow {
  serviceId: string; serviceName: string; priceAmount: number; currency: string;
  durationMinutes: number; isActive: boolean; salonId: string; salonName: string;
  categoryName: string | null; assignedStylistCount: number;
  totalBookings: number; completedBookings: number; cancelledCount: number; revenue: number;
}
interface Response { items: ServiceRow[]; total: number; page: number; pageSize: number; }

const TODAY = new Date().toISOString().slice(0, 10);
function fmt(cents: number, cur: string) { return new Intl.NumberFormat('az-AZ', { style: 'currency', currency: cur }).format(cents / 100); }

export default function ReportsServicesPage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(TODAY);
  const [salonFilter, setSalonFilter] = useState('');
  const [salons, setSalons] = useState<Salon[]>([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { apiFetch<{ items: Salon[] }>('/salons?pageSize=200').then((r) => setSalons(r.items)).catch(() => {}); }, []);

  function load() {
    setLoading(true); setError(null);
    const q = new URLSearchParams({ from, to, page: String(page), pageSize: '20' });
    if (salonFilter) q.set('salonId', salonFilter);
    apiFetch<Response>(`/superadmin/reports/services?${q}`)
      .then((r) => { setData(r); setLoading(false); })
      .catch((err) => { setError(err instanceof ApiError ? err.message : 'Yüklənmədi'); setLoading(false); });
  }

  useEffect(load, [from, to, salonFilter, page]);
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <main className="dashboard-page">
      <div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Xidmət Hesabatları</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>Hər xidmət üzrə performans</p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={from} max={to} onChange={(e) => { setPage(1); setFrom(e.target.value); }} style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', background: 'var(--color-surface)' }} />
        <span>–</span>
        <input type="date" value={to} min={from} max={TODAY} onChange={(e) => { setPage(1); setTo(e.target.value); }} style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', background: 'var(--color-surface)' }} />
        <Select value={salonFilter} onChange={(e) => { setPage(1); setSalonFilter(e.target.value); }} style={{ maxWidth: 180 }}>
          <option value="">Bütün salonlar</option>
          {salons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <button onClick={load} disabled={loading} style={{ padding: '0.4rem 0.9rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', cursor: 'pointer' }}>
          {loading ? 'Yüklənir…' : 'Tətbiq et'}
        </button>
      </div>
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {loading && !data ? <Skeleton className="h-64 w-full" /> : data?.items.length === 0 ? (
        <EmptyState title="Məlumat yoxdur" description="Seçilmiş dövrdə xidmət məlumatı tapılmadı." />
      ) : data ? (
        <>
          <Table
            columns={[
              { key: 'service', header: 'Xidmət', render: (r: ServiceRow) => <Link href={`/superadmin/services/${r.serviceId}`}>{r.serviceName}</Link> },
              { key: 'salon', header: 'Salon', render: (r: ServiceRow) => <Link href={`/superadmin/salons/${r.salonId}`}>{r.salonName}</Link> },
              { key: 'category', header: 'Kateqoriya', render: (r: ServiceRow) => r.categoryName ?? '—' },
              { key: 'price', header: 'Qiymət', render: (r: ServiceRow) => fmt(r.priceAmount, r.currency) },
              { key: 'duration', header: 'Müddət', render: (r: ServiceRow) => `${r.durationMinutes} dəq` },
              { key: 'stylists', header: 'Stilistlər', render: (r: ServiceRow) => r.assignedStylistCount },
              { key: 'bookings', header: 'Rezerv.', render: (r: ServiceRow) => r.totalBookings },
              { key: 'completed', header: 'Tamamlanan', render: (r: ServiceRow) => r.completedBookings },
              { key: 'cancelled', header: 'Ləğv', render: (r: ServiceRow) => r.cancelledCount },
              { key: 'revenue', header: 'Gəlir', render: (r: ServiceRow) => fmt(r.revenue, r.currency) },
              { key: 'status', header: '', render: (r: ServiceRow) => <Badge tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Aktiv' : 'Deaktiv'}</Badge> },
            ]}
            rows={data.items}
            getRowKey={(r) => r.serviceId}
          />
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </>
      ) : null}
    </main>
  );
}
