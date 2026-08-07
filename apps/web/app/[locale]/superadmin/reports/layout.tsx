import type { ReactNode } from 'react';
import Link from 'next/link';

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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ borderBottom: '1px solid var(--color-border)', padding: '0 2rem', background: 'var(--color-surface)' }}>
        <nav style={{ display: 'flex', gap: 0, overflowX: 'auto' }} aria-label="Hesabat növləri">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                padding: '0.8rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                borderBottom: '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
