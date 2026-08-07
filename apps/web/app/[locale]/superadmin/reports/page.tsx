'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../lib/api-client';

interface Overview {
  from: string; to: string;
  salons: { total: number; active: number };
  stylists: { total: number; active: number };
  services: { total: number; active: number };
  reservations: { total: number; completed: number; confirmed: number; cancelled: number; noShows: number; pending: number; cancellationRate: number; completionRate: number };
  revenue: number;
  customers: { unique: number };
}

const PRESETS = [
  { label: 'Bu gün', days: 0 },
  { label: 'Son 7 gün', days: 7 },
  { label: 'Son 30 gün', days: 30 },
  { label: 'Bu ay', days: -1 },
];

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem' }}>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>{label}</p>
      <p style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.25rem 0 0', color: 'var(--color-text-primary)' }}>{value}</p>
      {sub && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>{sub}</p>}
    </div>
  );
}

function getMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

export default function ReportsOverviewPage() {
  const TODAY = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(TODAY);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load(f: string, t: string) {
    setLoading(true);
    setError(null);
    apiFetch<Overview>(`/superadmin/reports/overview?from=${f}&to=${t}`)
      .then((r) => { setData(r); setLoading(false); })
      .catch((err) => { setError(err instanceof ApiError ? err.message : 'Yüklənmədi'); setLoading(false); });
  }

  useEffect(() => { load(from, to); }, []);

  function applyPreset(days: number) {
    let f: string, t: string;
    if (days === -1) {
      const b = getMonthBounds();
      f = b.from; t = b.to;
    } else if (days === 0) {
      f = TODAY; t = TODAY;
    } else {
      f = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      t = TODAY;
    }
    setFrom(f); setTo(t);
    load(f, t);
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1.5rem 2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Platform İcmalı</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>Bütün salonlar üzrə məcmu statistika</p>
      </div>

      {/* Date filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => applyPreset(p.days)} style={{ padding: '0.4rem 0.9rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', background: 'var(--color-surface)', cursor: 'pointer', fontWeight: 500 }}>
            {p.label}
          </button>
        ))}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', background: 'var(--color-surface)' }} />
          <span style={{ fontSize: '0.8rem' }}>–</span>
          <input type="date" value={to} min={from} max={TODAY} onChange={(e) => setTo(e.target.value)} style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', background: 'var(--color-surface)' }} />
          <button onClick={() => load(from, to)} disabled={loading} style={{ padding: '0.4rem 0.9rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Yüklənir…' : 'Tətbiq et'}
          </button>
        </div>
      </div>

      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{error}</p>}

      {data && (
        <>
          {/* Reservations */}
          <section>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Rezervasiyalar</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
              <StatCard label="Ümumi" value={data.reservations.total} />
              <StatCard label="Tamamlananlar" value={data.reservations.completed} sub={pct(data.reservations.completionRate)} />
              <StatCard label="Təsdiqlənənlər" value={data.reservations.confirmed} />
              <StatCard label="Ləğv edilənlər" value={data.reservations.cancelled} sub={pct(data.reservations.cancellationRate)} />
              <StatCard label="Gəlməyənlər" value={data.reservations.noShows} />
              <StatCard label="Gözləyənlər" value={data.reservations.pending} />
              <StatCard label="Unikal müştərilər" value={data.customers.unique} />
            </div>
          </section>

          {/* Platform status */}
          <section>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Platform statusu</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
              <StatCard label="Ümumi salonlar" value={data.salons.total} sub={`${data.salons.active} aktiv`} />
              <StatCard label="Ümumi stilistlər" value={data.stylists.total} sub={`${data.stylists.active} aktiv`} />
              <StatCard label="Ümumi xidmətlər" value={data.services.total} sub={`${data.services.active} aktiv`} />
            </div>
          </section>

          {/* Revenue */}
          {data.revenue > 0 && (
            <section>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Gəlir</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                <StatCard label="Ümumi gəlir (qəpik)" value={data.revenue.toLocaleString('az-AZ')} />
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
