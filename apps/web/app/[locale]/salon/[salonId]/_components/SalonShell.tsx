'use client';

import { Drawer } from '@salonomia/ui';
import NextLink from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '../../../../../lib/api-client';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
  style: { flexShrink: 0 },
};

function HomeIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function CalendarCheckIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg {...ICON_PROPS}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 5h14M3 10h14M3 15h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

const LOCALE_LABELS: Record<string, { flag: string; code: string }> = {
  az: { flag: '🇦🇿', code: 'AZ' },
  en: { flag: '🇬🇧', code: 'EN' },
  ru: { flag: '🇷🇺', code: 'RU' },
  tr: { flag: '🇹🇷', code: 'TR' },
};

interface NavItemDef {
  labelKey: string;
  segment: string;
  sectionKey: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  showBadge?: boolean;
}

const NAV_ITEMS: NavItemDef[] = [
  { labelKey: 'nav.overview', segment: '', sectionKey: 'nav.sectionDaily', icon: <HomeIcon /> },
  {
    labelKey: 'nav.reservations',
    segment: 'reservations',
    sectionKey: 'nav.sectionDaily',
    icon: <CalendarCheckIcon />,
    showBadge: true,
  },
  {
    labelKey: 'nav.employees',
    segment: 'employees',
    sectionKey: 'nav.sectionSalon',
    icon: <UsersIcon />,
  },
  {
    labelKey: 'nav.services',
    segment: 'services',
    sectionKey: 'nav.sectionSalon',
    icon: <SparklesIcon />,
  },
  {
    labelKey: 'nav.serviceCategories',
    segment: 'service-categories',
    sectionKey: 'nav.sectionSalon',
    icon: <TagIcon />,
    adminOnly: true,
  },
  {
    labelKey: 'nav.customers',
    segment: 'customers',
    sectionKey: 'nav.sectionSalon',
    icon: <PersonIcon />,
  },
  {
    labelKey: 'nav.ratings',
    segment: 'ratings',
    sectionKey: 'nav.sectionSalon',
    icon: <StarIcon />,
  },
  {
    labelKey: 'nav.reports',
    segment: 'reports',
    sectionKey: 'nav.sectionManagement',
    icon: <ChartIcon />,
    adminOnly: true,
  },
  {
    labelKey: 'nav.settings',
    segment: 'settings',
    sectionKey: 'nav.sectionManagement',
    icon: <GearIcon />,
  },
];

interface CurrentUser {
  isSuperadmin: boolean;
}

interface SalonMembership {
  salonId: string;
  salonName: string;
  role: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNavActive(href: string, basePath: string, pathname: string): boolean {
  // Exact match for overview (root)
  if (href === basePath) return pathname === basePath || pathname === `${basePath}/`;
  return pathname.startsWith(href);
}

// ─── Sidebar nav content ──────────────────────────────────────────────────────

function SidebarNav({
  items,
  basePath,
  pathname,
  pendingCount,
  onNavigate,
  t,
}: {
  items: NavItemDef[];
  basePath: string;
  pathname: string;
  pendingCount: number;
  onNavigate?: () => void;
  t: (key: string) => string;
}) {
  // Group by section (preserve order)
  const sections: { sectionKey: string; items: NavItemDef[] }[] = [];
  for (const item of items) {
    const existing = sections.find((s) => s.sectionKey === item.sectionKey);
    if (existing) existing.items.push(item);
    else sections.push({ sectionKey: item.sectionKey, items: [item] });
  }

  return (
    <nav
      aria-label="Salon navigation"
      style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0.75rem' }}
    >
      {sections.map((group) => (
        <div key={group.sectionKey} style={{ marginBottom: '0.5rem' }}>
          <p className="dash-nav-section">{t(group.sectionKey)}</p>
          {group.items.map((item) => {
            const href = item.segment ? `${basePath}/${item.segment}` : basePath;
            const active = isNavActive(href, basePath, pathname);
            const badge = item.showBadge ? pendingCount : undefined;
            return (
              <NextLink
                key={item.segment}
                href={href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={`dash-nav-link${active ? ' active' : ''}`}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{t(item.labelKey)}</span>
                {badge !== undefined && badge > 0 ? (
                  <span
                    style={{
                      background: 'var(--color-accent)',
                      color: '#fff',
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      borderRadius: '9999px',
                      padding: '0 0.375rem',
                      minWidth: '1.25rem',
                      height: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </NextLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// ─── Language switcher ────────────────────────────────────────────────────────

function SidebarLanguageSwitcher({ label }: { label: string }) {
  const params = useParams();
  const currentLocale = (params?.locale as string | undefined) ?? 'az';

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    document.cookie = `NEXT_LOCALE=${e.target.value};path=/;max-age=31536000;SameSite=Lax`;
    window.location.reload();
  }

  return (
    <div
      style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}
    >
      <p className="dash-nav-section" style={{ padding: '0 0 0.375rem' }}>
        {label}
      </p>
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <select
          value={currentLocale}
          onChange={handleChange}
          aria-label="Select language"
          style={{
            appearance: 'none',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.5rem 2rem 0.5rem 0.75rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            width: '100%',
          }}
        >
          {Object.entries(LOCALE_LABELS).map(([loc, { flag, code }]) => (
            <option key={loc} value={loc}>
              {flag} {code}
            </option>
          ))}
        </select>
        <span
          style={{
            position: 'absolute',
            right: '0.625rem',
            pointerEvents: 'none',
            fontSize: '0.6rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          ▾
        </span>
      </div>
    </div>
  );
}

// ─── Logout button ───────────────────────────────────────────────────────────

function SalonLogoutButton() {
  const t = useTranslations('salonAdmin');
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Cookie cleared server-side regardless
    } finally {
      window.location.replace('/login');
    }
  }

  return (
    <div
      style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}
    >
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={busy}
        className="dash-nav-link"
        style={{
          width: '100%',
          background: 'none',
          font: 'inherit',
          fontWeight: 500,
          textAlign: 'left',
          cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.6 : 1,
          color: 'var(--color-danger)',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>{busy ? t('nav.loggingOut') : t('nav.logout')}</span>
      </button>
    </div>
  );
}

// ─── Brand block at top of sidebar ───────────────────────────────────────────

/** Purple accent strip carrying the salon name — the salon panel's identity marker. */
function SalonBrand({ name, roleLabel }: { name: string; roleLabel: string }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #6a5acd 0%, #5b4bb5 100%)',
        padding: '1rem 1.25rem',
        flexShrink: 0,
        minHeight: 'var(--admin-header-height)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}
      >
        <svg width="12" height="12" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="9.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" />
          <path
            d="M7 11c0-2.21 1.79-4 4-4s4 1.79 4 4"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="11" cy="14" r="1.4" fill="rgba(255,255,255,0.85)" />
        </svg>
        <span
          style={{
            fontSize: '0.5625rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.72)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          Salonomia · {roleLabel}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: '0.9375rem',
          fontWeight: 700,
          color: '#fff',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={name}
      >
        {name}
      </p>
    </div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function SalonShell({
  salonId,
  salonName: initialName,
  children,
}: {
  salonId: string;
  salonName?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations('salonAdmin');
  const pathname = usePathname();
  const basePath = `/salon/${salonId}`;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [salonName, setSalonName] = useState(initialName ?? 'Salon');
  const [role, setRole] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Resolve role + salon name
  useEffect(() => {
    Promise.all([
      apiFetch<CurrentUser>('/auth/me').catch(() => null),
      apiFetch<SalonMembership[]>('/auth/my-salons').catch(() => [] as SalonMembership[]),
    ]).then(([user, memberships]) => {
      if (!user) return;
      if (user.isSuperadmin) {
        setRole('SALON_ADMIN');
        apiFetch<{ name: string }>(`/salons/${salonId}/settings`)
          .then((s) => setSalonName(s.name))
          .catch(() => {});
      } else {
        const membership = (memberships as SalonMembership[]).find((m) => m.salonId === salonId);
        if (membership) {
          setSalonName(membership.salonName);
          setRole(membership.role);
        }
      }
    });
  }, [salonId]);

  // Pending reservations badge
  useEffect(() => {
    apiFetch<{ total: number }>(`/salons/${salonId}/reservations?status=PENDING&pageSize=1`)
      .then((r) => setPendingCount(r.total))
      .catch(() => {});
  }, [salonId]);

  // Nav visibility mirrors the server-side permission matrix; every route re-authorizes anyway.
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!role) return false;
    if (role === 'SALON_MANAGER') {
      return item.segment === '' || item.segment === 'reservations';
    }
    return true;
  });

  const roleLabel = role === 'SALON_MANAGER' ? 'Manager' : 'Admin';

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--color-surface)' }}>
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex"
        style={{
          width: 'var(--admin-sidebar-width)',
          flexShrink: 0,
          flexDirection: 'column',
          background: 'var(--color-surface-raised)',
          borderRight: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          height: '100dvh',
        }}
      >
        <SalonBrand name={salonName} roleLabel={roleLabel} />
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '0.5rem' }}>
          <SidebarNav
            items={visibleItems}
            basePath={basePath}
            pathname={pathname}
            pendingCount={pendingCount}
            t={t}
          />
        </div>
        <SalonLogoutButton />
        <SidebarLanguageSwitcher label={t('nav.selectLanguage')} />
      </aside>

      {/* ── Main content column ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile top bar */}
        <header
          className="flex items-center gap-3 md:hidden"
          style={{
            height: 'var(--admin-header-height)',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface-raised)',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setDrawerOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <HamburgerIcon />
          </button>
          <span
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '0.9375rem',
              fontWeight: 700,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {salonName}
          </span>
          {pendingCount > 0 ? (
            <NextLink
              href={`${basePath}/reservations`}
              className="admin-chip admin-chip-accent"
              style={{ textDecoration: 'none' }}
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </NextLink>
          ) : null}
        </header>

        {/* Page content — pages own their <main> landmark. */}
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>

      {/* ── Mobile drawer ── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title={salonName}>
        <SidebarNav
          items={visibleItems}
          basePath={basePath}
          pathname={pathname}
          pendingCount={pendingCount}
          onNavigate={() => setDrawerOpen(false)}
          t={t}
        />
        <SalonLogoutButton />
        <SidebarLanguageSwitcher label={t('nav.selectLanguage')} />
      </Drawer>
    </div>
  );
}
