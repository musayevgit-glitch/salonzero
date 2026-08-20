'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const TABS = [
  { label: 'İcmal', href: '/superadmin/reports' },
  { label: 'Salonlar', href: '/superadmin/reports/salons' },
  { label: 'Stilistlər', href: '/superadmin/reports/stylists' },
  { label: 'Xidmətlər', href: '/superadmin/reports/services' },
  { label: 'Rezervasiyalar', href: '/superadmin/reports/reservations' },
  { label: 'Müştərilər', href: '/superadmin/reports/customers' },
  { label: 'Gəlir', href: '/superadmin/reports/revenue' },
];

export default function ReportsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-raised)',
          padding: '0 1rem',
        }}
      >
        <nav
          style={{
            display: 'flex',
            gap: '0.25rem',
            overflowX: 'auto',
            maxWidth: 1440,
            margin: '0 auto',
          }}
          aria-label="Hesabat növləri"
        >
          {TABS.map((tab) => {
            const active =
              tab.href === '/superadmin/reports'
                ? pathname === tab.href || pathname === `${tab.href}/`
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                style={{
                  padding: '0.9rem 0.875rem',
                  fontSize: '0.8125rem',
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  borderBottom: `2px solid ${active ? 'var(--color-accent)' : 'transparent'}`,
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
