'use client';

import { DashboardShell } from '@salonomia/ui';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/superadmin', section: 'Overview' },
  { label: 'Salons', href: '/superadmin/salons', section: 'Management' },
  { label: 'Users', href: '/superadmin/users', section: 'Management' },
  { label: 'Stylists', href: '/superadmin/stylists', section: 'Management' },
  { label: 'Audit Log', href: '/superadmin/audit-logs', section: 'Analytics' },
];

export function SuperadminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const activeHref =
    pathname === '/superadmin'
      ? '/superadmin'
      : NAV_ITEMS.find((item) => item.href !== '/superadmin' && pathname.startsWith(item.href))?.href ??
        '/superadmin';

  return (
    <DashboardShell
      navItems={NAV_ITEMS}
      activeHref={activeHref}
      contextLabel="Platform Admin"
      renderLink={(item, isActive) => (
        <NextLink
          key={item.href}
          href={item.href}
          className={`dash-nav-link${isActive ? ' active' : ''}`}
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
