'use client';

import {
  Badge, EmptyState, ErrorState, Input, Link, MobileRecordList,
  Pagination, PermissionDeniedState, Select, Skeleton, Table,
} from '@salonomia/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../lib/api-client';

interface Salon { id: string; name: string; }
interface ReservationItem {
  id: string; status: string; startAt: string; endAt: string;
  priceAmount: number; currency: string; customerName: string; customerEmail: string;
  customerId: string; salonId: string; salonName: string;
  serviceId: string; serviceName: string; employeeId: string; employeeName: string;
  createdAt: string;
}
interface ReservationListResponse { items: ReservationItem[]; total: number; page: number; pageSize: number; }
type LoadState = { kind: 'loading' } | { kind: 'permission-denied' } | { kind: 'error'; message: string } | { kind: 'ready'; data: ReservationListResponse };

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Gözləyir',
  CONFIRMED: 'Təsdiqlənib',
  REJECTED: 'Rədd edilib',
  CANCELLED_BY_CUSTOMER: 'Müştəri tərəf. ləğv',
  CANCELLED_BY_SALON: 'Salon tərəf. ləğv',
  CHECKED_IN: 'Gəldi',
  COMPLETED: 'Tamamlandı',
  NO_SHOW: 'Gəlmədi',
};
const STATUS_TONE: Record<string, 'success' | 'neutral' | 'danger' | 'warning'> = {
  PENDING: 'warning', CONFIRMED: 'success', REJECTED: 'danger',
  CANCELLED_BY_CUSTOMER: 'danger', CANCELLED_BY_SALON: 'danger',
  CHECKED_IN: 'success', COMPLETED: 'success', NO_SHOW: 'neutral',
};

function fmt(cents: number, cur: string) {
  return new Intl.NumberFormat('az-AZ', { style: 'currency', currency: cur }).format(cents / 100);
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function SuperadminReservationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [salonFilter, setSalonFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(TODAY);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [salons, setSalons] = useState<Salon[]>([]);

  useEffect(() => {
    apiFetch<{ items: Salon[] }>('/salons?pageSize=200').then((r) => setSalons(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    const q = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) q.set('search', search);
    if (salonFilter) q.set('salonId', salonFilter);
    if (statusFilter) q.set('status', statusFilter);
    if (from) q.set('from', from);
    if (to) q.set('to', to);

    apiFetch<ReservationListResponse>(`/superadmin/reservations?${q}`)
      .then((data) => { if (!cancelled) setState({ kind: 'ready', data }); })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) { router.replace('/login?returnTo=/superadmin/reservations'); return; }
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) { setState({ kind: 'permission-denied' }); return; }
        setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Xəta baş verdi.' });
      });
    return () => { cancelled = true; };
  }, [search, salonFilter, statusFilter, from, to, page, router]);

  if (state.kind === 'loading') return <main style={{ padding: '2rem' }}><Skeleton className="h-10 w-full max-w-md" /><div style={{ marginTop: '1rem' }}><Skeleton className="h-64 w-full" /></div></main>;
  if (state.kind === 'permission-denied') return <main style={{ padding: '2rem' }}><PermissionDeniedState /></main>;
  if (state.kind === 'error') return <main style={{ padding: '2rem' }}><ErrorState title="Rezervasiyalar yüklənmədi" description={state.message} /></main>;

  const { items, total, pageSize } = state.data;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Rezervasiyalar</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{total} rezervasiya tapıldı</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
        <Input placeholder="Axtar (müştəri, xidmət, stilist)..." value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} style={{ maxWidth: 240 }} />
        <Select value={salonFilter} onChange={(e) => { setPage(1); setSalonFilter(e.target.value); }} style={{ maxWidth: 180 }}>
          <option value="">Bütün salonlar</option>
          {salons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }} style={{ maxWidth: 180 }}>
          <option value="">Bütün statuslar</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', background: 'var(--color-surface)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>–</span>
          <input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', background: 'var(--color-surface)' }} />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Rezervasiya tapılmadı" description="Filtr parametrlərini dəyişin." />
      ) : (
        <>
          <Table
            columns={[
              { key: 'date', header: 'Tarix', render: (r: ReservationItem) => <span style={{ whiteSpace: 'nowrap' }}>{new Date(r.startAt).toLocaleString('az-AZ', { dateStyle: 'short', timeStyle: 'short' })}</span> },
              { key: 'customer', header: 'Müştəri', render: (r: ReservationItem) => <div><div style={{ fontWeight: 500 }}>{r.customerName}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{r.customerEmail}</div></div> },
              { key: 'salon', header: 'Salon', render: (r: ReservationItem) => <Link href={`/superadmin/salons/${r.salonId}`}>{r.salonName}</Link> },
              { key: 'service', header: 'Xidmət', render: (r: ReservationItem) => <Link href={`/superadmin/services/${r.serviceId}`}>{r.serviceName}</Link> },
              { key: 'employee', header: 'Stilist', render: (r: ReservationItem) => <Link href={`/superadmin/stylists/${r.employeeId}`}>{r.employeeName}</Link> },
              { key: 'price', header: 'Məbləğ', render: (r: ReservationItem) => fmt(r.priceAmount, r.currency) },
              { key: 'status', header: 'Status', render: (r: ReservationItem) => <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{STATUS_LABELS[r.status] ?? r.status}</Badge> },
            ]}
            rows={items}
            getRowKey={(r) => r.id}
          />
          <MobileRecordList
            rows={items}
            getRowKey={(r) => r.id}
            renderPrimary={(r) => <div><span style={{ fontWeight: 600 }}>{r.customerName}</span> · {r.serviceName}</div>}
            renderSecondary={(r) => `${r.salonName} · ${new Date(r.startAt).toLocaleString('az-AZ', { dateStyle: 'short', timeStyle: 'short' })}`}
            renderAction={(r) => <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{STATUS_LABELS[r.status] ?? r.status}</Badge>}
          />
        </>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </main>
  );
}
