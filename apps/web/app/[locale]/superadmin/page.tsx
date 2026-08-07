'use client';

import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../lib/api-client';
import Link from 'next/link';

interface Stats {
  salons: { total: number; active: number; suspended: number };
  stylists: { total: number; active: number; inactive: number };
  services: { total: number; active: number; inactive: number };
  reservations: { total: number; today: number; week: number; month: number };
  customers: { total: number };
  recentSalons: { id: string; name: string; status: string; city: string | null; createdAt: string }[];
  recentStylists: { id: string; fullName: string; isActive: boolean; createdAt: string; salonId: string; salonName: string }[];
}

function StatCard({ label, value, sub, accent, href }: { label: string; value: number | string; sub?: string; accent?: string; href?: string; }) {
  const content = (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '2rem', fontWeight: 700, color: accent ?? 'var(--color-text-primary)', lineHeight: 1.1 }}>{value}</span>
      {sub && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{sub}</span>}
    </div>
  );
  if (href) return <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link>;
  return content;
}

export default function SuperadminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<Stats>('/superadmin/stats')
      .then((s) => { setStats(s); setLoading(false); })
      .catch((err) => { setError(err instanceof ApiError ? err.message : 'Yüklənmədi'); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <main style={{ padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ height: 100, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
          ))}
        </div>
      </main>
    );
  }

  if (error) return <main style={{ padding: '2rem', color: 'var(--color-danger)' }}>{error}</main>;
  if (!stats) return null;

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1.5rem 2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Platform Dashboard</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>Platformanın ümumi vəziyyəti</p>
      </div>

      {/* Salons */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Salonlar</h2>
          <Link href="/superadmin/salons" style={{ fontSize: '0.8rem', color: 'var(--color-accent)', textDecoration: 'none' }}>Hamısı →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.75rem' }}>
          <StatCard label="Cəmi Salonlar" value={stats.salons.total} href="/superadmin/salons" />
          <StatCard label="Aktiv" value={stats.salons.active} accent="var(--color-success)" href="/superadmin/salons?status=ACTIVE" />
          <StatCard label="Deaktiv" value={stats.salons.suspended} accent="var(--color-danger)" href="/superadmin/salons?status=SUSPENDED" />
        </div>
      </section>

      {/* Stylists */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Stilistlər</h2>
          <Link href="/superadmin/stylists" style={{ fontSize: '0.8rem', color: 'var(--color-accent)', textDecoration: 'none' }}>Hamısı →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.75rem' }}>
          <StatCard label="Cəmi Stilistlər" value={stats.stylists.total} href="/superadmin/stylists" />
          <StatCard label="Aktiv" value={stats.stylists.active} accent="var(--color-success)" href="/superadmin/stylists?status=ACTIVE" />
          <StatCard label="Deaktiv" value={stats.stylists.inactive} href="/superadmin/stylists?status=INACTIVE" />
        </div>
      </section>

      {/* Services */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Xidmətlər</h2>
          <Link href="/superadmin/services" style={{ fontSize: '0.8rem', color: 'var(--color-accent)', textDecoration: 'none' }}>Hamısı →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.75rem' }}>
          <StatCard label="Cəmi Xidmətlər" value={stats.services.total} href="/superadmin/services" />
          <StatCard label="Aktiv" value={stats.services.active} accent="var(--color-success)" href="/superadmin/services?status=ACTIVE" />
          <StatCard label="Deaktiv" value={stats.services.inactive} href="/superadmin/services?status=INACTIVE" />
        </div>
      </section>

      {/* Reservations */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Rezervasiyalar</h2>
          <Link href="/superadmin/reservations" style={{ fontSize: '0.8rem', color: 'var(--color-accent)', textDecoration: 'none' }}>Hamısı →</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.75rem' }}>
          <StatCard label="Bugün" value={stats.reservations.today} href="/superadmin/reservations" />
          <StatCard label="Bu Həftə" value={stats.reservations.week} href="/superadmin/reservations" />
          <StatCard label="Bu Ay" value={stats.reservations.month} href="/superadmin/reservations" />
          <StatCard label="Cəmi" value={stats.reservations.total} href="/superadmin/reservations" />
          <StatCard label="Müştərilər" value={stats.customers.total} href="/superadmin/users" />
        </div>
      </section>

      {/* Recent activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Son salonlar</h2>
            <Link href="/superadmin/salons" style={{ fontSize: '0.8rem', color: 'var(--color-accent)', textDecoration: 'none' }}>Hamısı →</Link>
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {stats.recentSalons.length === 0 ? (
              <p style={{ padding: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Heç bir salon yoxdur.</p>
            ) : (
              stats.recentSalons.map((s, i) => (
                <Link key={s.id} href={`/superadmin/salons/${s.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', textDecoration: 'none', borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{s.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>{s.city ?? '—'}</p>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '9999px', background: s.status === 'ACTIVE' ? '#dcfce7' : '#f3f4f6', color: s.status === 'ACTIVE' ? '#16a34a' : '#6b7280' }}>{s.status === 'ACTIVE' ? 'Aktiv' : 'Deaktiv'}</span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Son stilistlər</h2>
            <Link href="/superadmin/stylists" style={{ fontSize: '0.8rem', color: 'var(--color-accent)', textDecoration: 'none' }}>Hamısı →</Link>
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {stats.recentStylists.length === 0 ? (
              <p style={{ padding: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Heç bir stilist yoxdur.</p>
            ) : (
              stats.recentStylists.map((s, i) => (
                <Link key={s.id} href={`/superadmin/stylists/${s.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', textDecoration: 'none', borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{s.fullName}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>{s.salonName}</p>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '9999px', background: s.isActive ? '#dcfce7' : '#f3f4f6', color: s.isActive ? '#16a34a' : '#6b7280' }}>{s.isActive ? 'Aktiv' : 'Deaktiv'}</span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Quick links */}
      <section>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Sürətli keçidlər</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {[
            { label: '+ Yeni Salon', href: '/superadmin/salons/new' },
            { label: '+ Yeni Stilist', href: '/superadmin/stylists/new' },
            { label: '+ Yeni Xidmət', href: '/superadmin/services/new' },
            { label: 'Hesabatlar →', href: '/superadmin/reports' },
            { label: 'Rezervasiyalar →', href: '/superadmin/reservations' },
            { label: 'Audit Jurnal →', href: '/superadmin/audit-logs' },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: '0.5rem 1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-primary)', textDecoration: 'none' }}>
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
