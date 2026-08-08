'use client';

import { Drawer } from '@salonomia/ui';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { apiFetch } from '../../../../../lib/api-client';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function CalendarCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l2.4 7.4L22 12l-7.6 2.6L12 22l-2.4-7.4L2 12l7.6-2.6z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
  { labelKey: 'nav.reservations', segment: 'reservations', sectionKey: 'nav.sectionDaily', icon: <CalendarCheckIcon />, showBadge: true },
  { labelKey: 'nav.employees', segment: 'employees', sectionKey: 'nav.sectionSalon', icon: <UsersIcon /> },
  { labelKey: 'nav.services', segment: 'services', sectionKey: 'nav.sectionSalon', icon: <SparklesIcon /> },
  { labelKey: 'nav.serviceCategories', segment: 'service-categories', sectionKey: 'nav.sectionSalon', icon: <TagIcon />, adminOnly: true },
  { labelKey: 'nav.customers', segment: 'customers', sectionKey: 'nav.sectionSalon', icon: <PersonIcon /> },
  { labelKey: 'nav.reports', segment: 'reports', sectionKey: 'nav.sectionManagement', icon: <ChartIcon />, adminOnly: true },
  { labelKey: 'nav.settings', segment: 'settings', sectionKey: 'nav.sectionManagement', icon: <GearIcon /> },
  { labelKey: 'nav.auditLog', segment: 'audit-logs', sectionKey: 'nav.sectionManagement', icon: <ListIcon />, adminOnly: true },
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

// ─── Individual nav link ──────────────────────────────────────────────────────

function SidebarNavLink({
  href,
  active,
  icon,
  label,
  badge,
  onNavigate,
  dark,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onNavigate?: () => void;
  dark?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const baseColor = dark ? 'rgba(255,255,255,0.6)' : 'var(--color-text-secondary)';
  const activeColor = dark ? '#fff' : 'var(--color-text-primary)';
  const activeBg = 'rgba(124,58,237,0.25)';
  const hoverBg = dark ? 'rgba(255,255,255,0.08)' : 'var(--color-surface)';
  const hoverColor = dark ? 'rgba(255,255,255,0.9)' : 'var(--color-text-primary)';

  return (
    <NextLink
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '0.4375rem 0.75rem',
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
        fontWeight: active ? 600 : 400,
        color: active ? activeColor : hovered ? hoverColor : baseColor,
        background: active ? activeBg : hovered ? hoverBg : 'transparent',
        textDecoration: 'none',
        transition: 'background 0.12s ease, color 0.12s ease',
        borderLeft: active && dark ? '2px solid #7c3aed' : '2px solid transparent',
        marginBottom: '1px',
      }}
    >
      <span style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && badge > 0 ? (
        <span
          style={{
            background: '#7c3aed',
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
}

// ─── Sidebar nav content ──────────────────────────────────────────────────────

function SidebarNav({
  items,
  basePath,
  pathname,
  pendingCount,
  onNavigate,
  dark,
  t,
}: {
  items: NavItemDef[];
  basePath: string;
  pathname: string;
  pendingCount: number;
  onNavigate?: () => void;
  dark?: boolean;
  t: (key: string) => string;
}) {
  // Group by section (preserve order)
  const sections: { sectionKey: string; items: NavItemDef[] }[] = [];
  for (const item of items) {
    const existing = sections.find((s) => s.sectionKey === item.sectionKey);
    if (existing) {
      existing.items.push(item);
    } else {
      sections.push({ sectionKey: item.sectionKey, items: [item] });
    }
  }

  return (
    <nav aria-label="Salon navigation" style={{ display: 'flex', flexDirection: 'column', padding: '0.25rem 0.5rem' }}>
      {sections.map((group) => (
        <div key={group.sectionKey} style={{ marginBottom: '0.75rem' }}>
          <p
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: dark ? 'rgba(255,255,255,0.28)' : 'var(--color-text-secondary)',
              padding: '0.5rem 0.75rem 0.125rem',
            }}
          >
            {t(group.sectionKey)}
          </p>
          {group.items.map((item) => {
            const href = item.segment ? `${basePath}/${item.segment}` : basePath;
            const active = isNavActive(href, basePath, pathname);
            return (
              <SidebarNavLink
                key={item.segment}
                href={href}
                active={active}
                icon={item.icon}
                label={t(item.labelKey)}
                badge={item.showBadge ? pendingCount : undefined}
                onNavigate={onNavigate}
                dark={dark}
              />
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// ─── Language switcher ────────────────────────────────────────────────────────

function SidebarLanguageSwitcher({ dark, label }: { dark?: boolean; label: string }) {
  const params = useParams();
  const currentLocale = (params?.locale as string | undefined) ?? 'az';

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    document.cookie = `NEXT_LOCALE=${e.target.value};path=/;max-age=31536000;SameSite=Lax`;
    window.location.reload();
  }

  const borderColor = dark ? 'rgba(255,255,255,0.12)' : 'var(--color-border)';
  const bg = dark ? 'rgba(255,255,255,0.07)' : 'var(--color-surface)';
  const color = dark ? 'rgba(255,255,255,0.6)' : 'var(--color-text-secondary)';

  return (
    <div style={{ padding: '0.75rem 1rem', borderTop: `1px solid ${borderColor}`, flexShrink: 0 }}>
      <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.28)' : 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
        {label}
      </p>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%' }}>
        <select
          value={currentLocale}
          onChange={handleChange}
          aria-label="Select language"
          style={{
            appearance: 'none',
            background: bg,
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            padding: '0.3rem 2rem 0.3rem 0.625rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            color,
            cursor: 'pointer',
            fontFamily: 'inherit',
            width: '100%',
          }}
        >
          {Object.entries(LOCALE_LABELS).map(([loc, { flag, code }]) => (
            <option key={loc} value={loc} style={{ background: '#1a1625', color: '#fff' }}>
              {flag} {code}
            </option>
          ))}
        </select>
        <span style={{ position: 'absolute', right: '0.5rem', pointerEvents: 'none', fontSize: '0.6rem', color }}>▾</span>
      </div>
    </div>
  );
}

// ─── Brand block at top of sidebar ───────────────────────────────────────────

function SalonBrand({ name }: { name: string }) {
  return (
    <div
      style={{
        padding: '1.125rem 1rem 1rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div
          style={{
            width: '1.375rem',
            height: '1.375rem',
            borderRadius: '0.3125rem',
            background: 'rgba(124,58,237,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="10" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            <path d="M7 11c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="11" cy="14" r="1.5" fill="rgba(255,255,255,0.9)" />
          </svg>
        </div>
        <span
          style={{
            fontSize: '0.625rem',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Salonomia
        </span>
      </div>
      <p
        style={{
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

const SIDEBAR_BG = '#1a1625';

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
        const membership = (memberships as SalonMembership[]).find(
          (m) => m.salonId === salonId,
        );
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

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!role) return false;
    if (role === 'SALON_MANAGER') {
      return item.segment === '' || item.segment === 'reservations';
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', background: 'var(--color-surface)' }}>

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex"
        style={{
          width: '240px',
          flexShrink: 0,
          flexDirection: 'column',
          background: SIDEBAR_BG,
          position: 'sticky',
          top: 0,
          height: '100dvh',
        }}
      >
        <SalonBrand name={salonName} />
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '0.5rem' }}>
          <SidebarNav
            items={visibleItems}
            basePath={basePath}
            pathname={pathname}
            pendingCount={pendingCount}
            dark
            t={t}
          />
        </div>
        <SidebarLanguageSwitcher dark label={t('nav.selectLanguage')} />
      </aside>

      {/* ── Main content column ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Mobile top bar */}
        <header
          className="flex items-center gap-3 md:hidden"
          style={{
            height: '3.5rem',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: SIDEBAR_BG,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setDrawerOpen(true)}
            style={{
              color: 'rgba(255,255,255,0.75)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.375rem',
              borderRadius: '0.375rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HamburgerIcon />
          </button>
          <span
            style={{
              color: '#fff',
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
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '1.25rem' }} className="md:p-8">
          {children}
        </main>
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
        <SidebarLanguageSwitcher label={t('nav.selectLanguage')} />
      </Drawer>
    </div>
  );
}
