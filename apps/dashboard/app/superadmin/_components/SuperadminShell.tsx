'use client';

import { DashboardShell } from '@salonomia/ui';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Salons', href: '/superadmin/salons' },
  { label: 'Reports', href: '/superadmin/reports' },
  { label: 'Audit Log', href: '/superadmin/audit-logs' },
];

export function SuperadminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const activeHref =
    NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.href ?? NAV_ITEMS[0]?.href ?? '';

  return (
    <DashboardShell
      navItems={NAV_ITEMS}
      activeHref={activeHref}
      renderLink={(item, isActive) => (
        <NextLink
          key={item.href}
          href={item.href}
          className={[
            'block rounded-md px-3 py-2 text-sm transition-colors',
            isActive
              ? 'bg-accent/10 font-medium text-accent'
              : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
          ].join(' ')}
          aria-current={isActive ? 'page' : undefined}
        >
          {item.label}
        </NextLink>
      )}
    >
      {children}
    </DashboardShell>
  );
}
