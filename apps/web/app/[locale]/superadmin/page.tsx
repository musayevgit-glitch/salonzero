'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { LinkButton } from '../../_components/admin/LinkButton';
import { PageHeader } from '../../_components/admin/PageHeader';
import { SectionCard } from '../../_components/admin/SectionCard';
import { StatCard } from '../../_components/admin/StatCard';

interface Stats {
  salons: { total: number; active: number; suspended: number };
  stylists: { total: number; active: number; inactive: number };
  services: { total: number; active: number; inactive: number };
  reservations: { total: number; today: number; week: number; month: number };
  customers: { total: number };
  recentSalons: { id: string; name: string; status: string; city: string | null; createdAt: string }[];
  recentStylists: {
    id: string;
    fullName: string;
    isActive: boolean;
    createdAt: string;
    salonId: string;
    salonName: string;
  }[];
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const I = {
  width: 18,
  height: 18,
  viewBox: '0 0 20 20',
  fill: 'none',
  'aria-hidden': true as const,
};

function SalonIcon() {
  return (
    <svg {...I}>
      <path d="M2 8l8-6 8 6v9a1 1 0 01-1 1H3a1 1 0 01-1-1V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 18v-6h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function StylistIcon() {
  return (
    <svg {...I}>
      <circle cx="10" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 18c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function ServiceIcon() {
  return (
    <svg {...I}>
      <path d="M10 2.5l1.9 5.6 5.6 1.9-5.6 1.9L10 17.5l-1.9-5.6L2.5 10l5.6-1.9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg {...I}>
      <rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 2v3M14 2v3M2 8h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function CustomerIcon() {
  return (
    <svg {...I}>
      <circle cx="7" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 17c0-3 2.7-5 6-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.5 12.5c1-.4 2-.5 2.5-.5 3.3 0 6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Small building blocks ───────────────────────────────────────────────────

function ViewAllLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}
    >
      Hamısı →
    </Link>
  );
}

/** Horizontal split bar showing active vs inactive share for a resource. */
function SplitBar({ active, total }: { active: number; total: number }) {
  const pct = total > 0 ? Math.round((active / total) * 100) : 0;
  return (
    <div>
      <div
        style={{
          height: 8,
          borderRadius: 9999,
          background: 'var(--color-surface-muted)',
          overflow: 'hidden',
        }}
        role="img"
        aria-label={`Aktiv nisbəti: ${pct}%`}
      >
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-accent)', borderRadius: 9999 }} />
      </div>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
        {active} / {total} aktiv ({pct}%)
      </p>
    </div>
  );
}

function StatusChip({ active, label }: { active: boolean; label: string }) {
  return <span className={`admin-chip ${active ? 'admin-chip-success' : 'admin-chip-neutral'}`}>{label}</span>;
}

function RecentRow({
  href,
  primary,
  secondary,
  trailing,
  first,
}: {
  href: string;
  primary: string;
  secondary: string;
  trailing: React.ReactNode;
  first: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '0.75rem 1.25rem',
        textDecoration: 'none',
        borderTop: first ? undefined : '1px solid var(--color-border)',
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {primary}
        </span>
        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{secondary}</span>
      </span>
      {trailing}
    </Link>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SuperadminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<Stats>('/superadmin/stats')
      .then((s) => {
        setStats(s);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Yüklənmədi');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="stat-grid">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="stat-card" style={{ height: 96 }} aria-hidden="true" />
          ))}
        </div>
        <div className="admin-card" style={{ height: 220 }} aria-hidden="true" />
        <p className="sr-only" role="status">
          Yüklənir…
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-page">
        <div className="admin-card admin-card-body" role="alert" style={{ color: 'var(--color-danger)' }}>
          {error}
        </div>
      </main>
    );
  }

  if (!stats) return null;

  return (
    <main className="dashboard-page">
      <PageHeader
        title="Platform Dashboard"
        description="Platformanın ümumi vəziyyəti"
        actions={
          <>
            <LinkButton href="/superadmin/salons/new" variant="secondary">+ Yeni salon</LinkButton>
            <LinkButton href="/superadmin/reports">Hesabatlar</LinkButton>
          </>
        }
      />

      {/* ── KPI row ── */}
      <div className="stat-grid">
        <StatCard label="Salonlar" value={stats.salons.total} sub={`${stats.salons.active} aktiv`} icon={<SalonIcon />} href="/superadmin/salons" />
        <StatCard label="Stilistlər" value={stats.stylists.total} sub={`${stats.stylists.active} aktiv`} icon={<StylistIcon />} tone="info" href="/superadmin/stylists" />
        <StatCard label="Xidmətlər" value={stats.services.total} sub={`${stats.services.active} aktiv`} icon={<ServiceIcon />} tone="warning" href="/superadmin/services" />
        <StatCard label="Rezervasiyalar (bugün)" value={stats.reservations.today} sub={`${stats.reservations.month} bu ay`} icon={<CalendarIcon />} tone="success" href="/superadmin/reservations" />
        <StatCard label="Müştərilər" value={stats.customers.total} sub="Qeydiyyatdan keçmiş" icon={<CustomerIcon />} tone="neutral" href="/superadmin/users" />
      </div>

      {/* ── Breakdown + reservation volume ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Resurs vəziyyəti" className="lg:col-span-2">
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">Salonlar</p>
              <SplitBar active={stats.salons.active} total={stats.salons.total} />
              <p className="mt-1 text-xs text-text-secondary">{stats.salons.suspended} deaktiv</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">Stilistlər</p>
              <SplitBar active={stats.stylists.active} total={stats.stylists.total} />
              <p className="mt-1 text-xs text-text-secondary">{stats.stylists.inactive} deaktiv</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">Xidmətlər</p>
              <SplitBar active={stats.services.active} total={stats.services.total} />
              <p className="mt-1 text-xs text-text-secondary">{stats.services.inactive} deaktiv</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Rezervasiya həcmi" headerAction={<ViewAllLink href="/superadmin/reservations" />}>
          <dl className="flex flex-col gap-3">
            {[
              { label: 'Bugün', value: stats.reservations.today },
              { label: 'Bu həftə', value: stats.reservations.week },
              { label: 'Bu ay', value: stats.reservations.month },
              { label: 'Cəmi', value: stats.reservations.total },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <dt className="text-sm text-text-secondary">{row.label}</dt>
                <dd className="text-base font-bold text-text-primary">{row.value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>

      {/* ── Recent activity ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Son salonlar" headerAction={<ViewAllLink href="/superadmin/salons" />} padded={false}>
          {stats.recentSalons.length === 0 ? (
            <p style={{ padding: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              Heç bir salon yoxdur.
            </p>
          ) : (
            stats.recentSalons.map((s, i) => (
              <RecentRow
                key={s.id}
                href={`/superadmin/salons/${s.id}`}
                primary={s.name}
                secondary={s.city ?? '—'}
                first={i === 0}
                trailing={<StatusChip active={s.status === 'ACTIVE'} label={s.status === 'ACTIVE' ? 'Aktiv' : 'Deaktiv'} />}
              />
            ))
          )}
        </SectionCard>

        <SectionCard title="Son stilistlər" headerAction={<ViewAllLink href="/superadmin/stylists" />} padded={false}>
          {stats.recentStylists.length === 0 ? (
            <p style={{ padding: '1.25rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              Heç bir stilist yoxdur.
            </p>
          ) : (
            stats.recentStylists.map((s, i) => (
              <RecentRow
                key={s.id}
                href={`/superadmin/stylists/${s.id}`}
                primary={s.fullName}
                secondary={s.salonName}
                first={i === 0}
                trailing={<StatusChip active={s.isActive} label={s.isActive ? 'Aktiv' : 'Deaktiv'} />}
              />
            ))
          )}
        </SectionCard>
      </div>

      {/* ── Quick links ── */}
      <SectionCard title="Sürətli keçidlər">
        <div className="flex flex-wrap gap-2.5">
          {[
            { label: '+ Yeni Salon', href: '/superadmin/salons/new' },
            { label: '+ Yeni Stilist', href: '/superadmin/stylists/new' },
            { label: '+ Yeni Xidmət', href: '/superadmin/services/new' },
            { label: 'Hesabatlar →', href: '/superadmin/reports' },
            { label: 'Rezervasiyalar →', href: '/superadmin/reservations' },
            { label: 'Audit Jurnal →', href: '/superadmin/audit-logs' },
          ].map((item) => (
            <LinkButton key={item.href} href={item.href} variant="secondary" size="sm">
              {item.label}
            </LinkButton>
          ))}
        </div>
      </SectionCard>
    </main>
  );
}
