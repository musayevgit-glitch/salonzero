'use client';

import { DashboardShell } from '@salonomia/ui';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function IconSalons() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M2 8l8-6 8 6v9a1 1 0 01-1 1H3a1 1 0 01-1-1V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 18v-6h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function IconStylists() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 18c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconServices() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M4 5h12M4 9h8M4 13h10M4 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconReservations() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 2v3M14 2v3M2 8h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="13" r="1" fill="currentColor" />
      <circle cx="10" cy="13" r="1" fill="currentColor" />
      <circle cx="13" cy="13" r="1" fill="currentColor" />
    </svg>
  );
}
function IconReports() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M2 15l4-5 4 2.5 4-7 4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 17c0-3 2.7-5 6-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.5 12.5c1-.4 2-.5 2.5-.5 3.3 0 6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconAudit() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M4 3h8l4 4v11a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 3v4h4M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Nav config ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/superadmin', section: 'Əsas' },
  { label: 'Salonlar', href: '/superadmin/salons', section: 'İdarəetmə' },
  { label: 'Stilistlər', href: '/superadmin/stylists', section: 'İdarəetmə' },
  { label: 'Xidmətlər', href: '/superadmin/services', section: 'İdarəetmə' },
  { label: 'Rezervasiyalar', href: '/superadmin/reservations', section: 'İdarəetmə' },
  { label: 'Hesabatlar', href: '/superadmin/reports', section: 'Analitika' },
  { label: 'İstifadəçilər', href: '/superadmin/users', section: 'Sistem' },
  { label: 'Audit Jurnal', href: '/superadmin/audit-logs', section: 'Sistem' },
];

const ICON_MAP: Record<string, () => ReactNode> = {
  '/superadmin': IconDashboard,
  '/superadmin/salons': IconSalons,
  '/superadmin/stylists': IconStylists,
  '/superadmin/services': IconServices,
  '/superadmin/reservations': IconReservations,
  '/superadmin/reports': IconReports,
  '/superadmin/users': IconUsers,
  '/superadmin/audit-logs': IconAudit,
};

// ─── Shell ───────────────────────────────────────────────────────────────────

export function SuperadminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const activeHref =
    pathname === '/superadmin'
      ? '/superadmin'
      : NAV_ITEMS.find((item) => item.href !== '/superadmin' && pathname.startsWith(item.href))
          ?.href ?? '/superadmin';

  return (
    <DashboardShell
      navItems={NAV_ITEMS}
      activeHref={activeHref}
      contextLabel="Platform Admin"
      renderLink={(item, isActive) => {
        const Icon = ICON_MAP[item.href];
        return (
          <NextLink
            key={item.href}
            href={item.href}
            className={`dash-nav-link${isActive ? ' active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {Icon ? <Icon /> : null}
            <span>{item.label}</span>
          </NextLink>
        );
      }}
    >
      {children}
    </DashboardShell>
  );
}
