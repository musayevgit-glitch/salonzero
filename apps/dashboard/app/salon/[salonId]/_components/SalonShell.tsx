'use client';

import { DashboardShell } from '@salonomia/ui';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Reservations', segment: 'reservations' },
  { label: 'Employees', segment: 'employees' },
  { label: 'Services', segment: 'services' },
  { label: 'Service Categories', segment: 'service-categories' },
  { label: 'Reports', segment: 'reports' },
  { label: 'Audit Log', segment: 'audit-logs' },
];

export function SalonShell({ salonId, children }: { salonId: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const basePath = `/salon/${salonId}`;

  const navItems = NAV_ITEMS.map((item) => ({
    label: item.label,
    href: `${basePath}/${item.segment}`,
  }));

  const activeHref =
    navItems.find((item) => pathname.startsWith(item.href))?.href ?? navItems[0]?.href ?? '';

  return (
    <DashboardShell
      navItems={navItems}
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
