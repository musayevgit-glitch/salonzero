'use client';

import { DashboardShell } from '@salonomia/ui';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api-client';

const NAV_ITEMS = [
  { label: 'Reservations', segment: 'reservations', section: 'Operations' },
  { label: 'Employees', segment: 'employees', section: 'Operations' },
  { label: 'Services', segment: 'services', section: 'Catalogue' },
  { label: 'Service Categories', segment: 'service-categories', section: 'Catalogue' },
  { label: 'Reports', segment: 'reports', section: 'Analytics' },
  { label: 'Audit Log', segment: 'audit-logs', section: 'Analytics' },
];

interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  isSuperadmin: boolean;
}

interface SalonMembership {
  salonId: string;
  salonName: string;
  role: string;
}

export function SalonShell({
  salonId,
  salonName,
  children,
}: {
  salonId: string;
  salonName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const basePath = `/salon/${salonId}`;
  const [allowedItems, setAllowedItems] = useState<typeof NAV_ITEMS>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<CurrentUser>('/auth/me').catch(() => null),
      apiFetch<SalonMembership[]>('/auth/my-salons').catch(() => [] as SalonMembership[]),
    ])
      .then(([user, memberships]) => {
        if (!user) {
          setLoading(false);
          return;
        }

        if (user.isSuperadmin) {
          // Superadmin can see everything
          setAllowedItems(NAV_ITEMS);
        } else {
          const membership = memberships.find((m) => m.salonId === salonId);
          if (membership?.role === 'SALON_MANAGER') {
            // Stylist/Manager only gets Reservations
            setAllowedItems(NAV_ITEMS.filter((item) => item.segment === 'reservations'));
          } else {
            // SALON_ADMIN gets everything
            setAllowedItems(NAV_ITEMS);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [salonId]);

  const navItems = allowedItems.map((item) => ({
    label: item.label,
    href: `${basePath}/${item.segment}`,
    section: item.section,
  }));

  const activeHref =
    navItems.find((item) => pathname.startsWith(item.href))?.href ?? navItems[0]?.href ?? '';

  return (
    <DashboardShell
      navItems={navItems}
      activeHref={activeHref}
      contextLabel={salonName ?? 'Salon'}
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
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
          <div style={{ height: '2rem', width: '200px', background: '#f3f4f6', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: '10rem', width: '100%', background: '#f3f4f6', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
        </div>
      ) : (
        children
      )}
    </DashboardShell>
  );
}
