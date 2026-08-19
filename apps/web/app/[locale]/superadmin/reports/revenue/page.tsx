'use client';

import { EmptyState, Link, Pagination, Select, Skeleton } from '@salonomia/ui';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface Salon { id: string; name: string; }
interface SalonRow { salonId: string; salonName: string; revenue: number; currency: string; confirmedCount: number; }
interface Response { total: number; byStatus: Record<string, number>; bySalon: SalonRow[]; from: string; to: string; }

const TODAY = new Date().toISOString().slice(0, 10);
function fmt(cents: number, cur: string) { return new Intl.NumberFormat('az-AZ', { style: 'currency', currency: cur }).format(cents / 100); }

export default function ReportsRevenuePage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(TODAY);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { apiFetch<{ items: Salon[] }>('/salons?pageSize=200').then((r) => setSalons(r.items)).catch(() => {}); }, []);

  function load() {
    setLoading(true); setError(null);
    apiFetch<Response>(`/superadmin/reports?from=${from}&to=${to}`)
      .then((r) => { setData(r); setLoading(false); })
      .catch((err) => { setError(err instanceof ApiError ? err.message : 'Yüklənmədi'); setLoading(false); });
  }

  useEffect(load, [from, to]);

  const totalRevenue = data?.bySalon.reduce((sum, r) => sum + r.revenue, 0) ?? 0;

  return (
    <main className="dashboard-page">
      <div>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Gəlir Hesabatları</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>Salon üzrə gəlir analitikası (rezervasiya qiymət snapshotları əsasında)</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', background: 'var(--color-surface)' }} />
        <span>–</span>
        <input type="date" value={to} min={from} max={TODAY} onChange={(e) => setTo(e.target.value)} style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', background: 'var(--color-surface)' }} />
        <button onClick={load} disabled={loading} style={{ padding: '0.4rem 0.9rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', cursor: 'pointer' }}>
          {loading ? 'Yüklənir…' : 'Tətbiq et'}
        </button>
      </div>

      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>Ümumi gəlir</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0' }}>{totalRevenue.toLocaleString()} qəp</p>
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>Ümumi rezervasiya</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0' }}>{data.total}</p>
          </div>
        </div>
      )}

      {loading && !data ? <Skeleton className="h-64 w-full" /> : data?.bySalon.length === 0 ? (
        <EmptyState title="Gəlir məlumatı yoxdur" description="Seçilmiş dövrdə tamamlanan rezervasiya tapılmadı." />
      ) : data ? (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Salon</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Rezervasiya</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Gəlir</th>
              </tr>
            </thead>
            <tbody>
              {data.bySalon.map((row, i) => (
                <tr key={row.salonId} style={{ borderBottom: i < data.bySalon.length - 1 ? '1px solid var(--color-border)' : undefined }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Link href={`/superadmin/salons/${row.salonId}`}>{row.salonName}</Link>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{row.confirmedCount}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>{fmt(row.revenue, row.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
