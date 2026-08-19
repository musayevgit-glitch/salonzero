'use client';

import { Drawer } from '@salonomia/ui';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '../../../../lib/api-client';

// ─── Icons ───────────────────────────────────────────────────────────────────

const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: '0 0 20 20',
  fill: 'none',
  'aria-hidden': true as const,
  style: { flexShrink: 0 },
};

function IconDashboard() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function IconSalons() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M2 8l8-6 8 6v9a1 1 0 01-1 1H3a1 1 0 01-1-1V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 18v-6h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function IconStylists() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="10" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 18c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconServices() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M10 2.5l1.9 5.6 5.6 1.9-5.6 1.9L10 17.5l-1.9-5.6L2.5 10l5.6-1.9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function IconReservations() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 2v3M14 2v3M2 8h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 12.5l1.8 1.8L13 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconReports() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M2 15l4-5 4 2.5 4-7 4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="7" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 17c0-3 2.7-5 6-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.5 12.5c1-.4 2-.5 2.5-.5 3.3 0 6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconAudit() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M4 3h8l4 4v11a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 3v4h4M6 10h8M6 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M8 17H4a1 1 0 01-1-1V4a1 1 0 011-1h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 14l4-4-4-4M17 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2.5a5 5 0 00-5 5v3.2l-1.2 2.2a.6.6 0 00.53.9h11.34a.6.6 0 00.53-.9L15 10.7V7.5a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 16.2a2.1 2.1 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function IconHamburger() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      style={{ transition: 'transform 120ms ease', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}
    >
      <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Wordmark() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: 'var(--color-accent)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: 'var(--shadow-accent)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 22 22" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="9" stroke="#fff" strokeWidth="1.6" />
          <path d="M7 11c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="11" cy="14" r="1.5" fill="#fff" />
        </svg>
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.15 }}>
          Salonomia
        </span>
        <span
          style={{
            fontSize: '0.5625rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-accent)',
          }}
        >
          Platform Admin
        </span>
      </span>
    </span>
  );
}

// ─── Nav config ──────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  section: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/superadmin', section: 'Əsas', icon: <IconDashboard /> },
  { label: 'Salonlar', href: '/superadmin/salons', section: 'İdarəetmə', icon: <IconSalons /> },
  { label: 'Stilistlər', href: '/superadmin/stylists', section: 'İdarəetmə', icon: <IconStylists /> },
  { label: 'Xidmətlər', href: '/superadmin/services', section: 'İdarəetmə', icon: <IconServices /> },
  { label: 'Rezervasiyalar', href: '/superadmin/reservations', section: 'İdarəetmə', icon: <IconReservations /> },
  { label: 'Hesabatlar', href: '/superadmin/reports', section: 'Analitika', icon: <IconReports /> },
  { label: 'İstifadəçilər', href: '/superadmin/users', section: 'Sistem', icon: <IconUsers /> },
  { label: 'Audit Jurnal', href: '/superadmin/audit-logs', section: 'Sistem', icon: <IconAudit /> },
];

function resolveActiveHref(pathname: string): string {
  if (pathname === '/superadmin' || pathname === '/superadmin/') return '/superadmin';
  return (
    NAV_ITEMS.find((item) => item.href !== '/superadmin' && pathname.startsWith(item.href))?.href ??
    '/superadmin'
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function SidebarNav({
  activeHref,
  onNavigate,
  items = NAV_ITEMS,
}: {
  activeHref: string;
  onNavigate?: () => void;
  items?: NavItem[];
}) {
  const groups: { section: string; items: NavItem[] }[] = [];
  for (const item of items) {
    const existing = groups.find((g) => g.section === item.section);
    if (existing) existing.items.push(item);
    else groups.push({ section: item.section, items: [item] });
  }

  return (
    <nav aria-label="Platform admin naviqasiyası" style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0.75rem' }}>
      {groups.map((group) => (
        <div key={group.section} style={{ marginBottom: '0.5rem' }}>
          <p className="dash-nav-section">{group.section}</p>
          {group.items.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <NextLink
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`dash-nav-link${isActive ? ' active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </NextLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/**
 * Ends the platform-admin session.
 *
 * POST /auth/logout clears the httpOnly `token` cookie server-side, so the credential is gone
 * rather than merely hidden. We then leave via `window.location.replace`, which drops the
 * superadmin URL from the history entry — pressing Back cannot restore the dashboard, and any
 * attempt to re-enter /superadmin is stopped by the middleware + server layout, forcing re-auth.
 */
function LogoutButton({ compact }: { compact?: boolean }) {
  const t = useTranslations('superadmin');
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Even if the call fails we still leave the panel; the server cookie is the source of truth.
    } finally {
      window.location.replace('/login');
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={loggingOut}
      className="dash-nav-link"
      style={{
        width: '100%',
        background: 'none',
        font: 'inherit',
        fontWeight: 500,
        textAlign: 'left',
        cursor: loggingOut ? 'not-allowed' : 'pointer',
        opacity: loggingOut ? 0.6 : 1,
        color: compact ? 'var(--color-danger)' : undefined,
      }}
    >
      <IconLogout />
      <span>{loggingOut ? t('loggingOut') : t('logout')}</span>
    </button>
  );
}

// ─── Header pieces ───────────────────────────────────────────────────────────

interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  isSuperadmin: boolean;
}

/** Quick jump across admin sections. Purely a navigation convenience — no data is fetched. */
function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('az');
    if (!q) return [];
    return NAV_ITEMS.filter((item) => item.label.toLocaleLowerCase('az').includes(q)).slice(0, 6);
  }, [query]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery('');
    router.push(href);
  }

  return (
    <div ref={boxRef} style={{ position: 'relative', flex: 1, maxWidth: 380, minWidth: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          height: 38,
          padding: '0 0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <IconSearch />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches.length > 0) go(matches[0]!.href);
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Bölmələrdə axtar…"
          aria-label="Bölmələrdə axtar"
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '0.8125rem',
            color: 'var(--color-text-primary)',
            fontFamily: 'inherit',
          }}
        />
      </div>
      {open && matches.length > 0 ? (
        <ul
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            listStyle: 'none',
            margin: 0,
            padding: '0.25rem',
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 40,
          }}
        >
          {matches.map((item) => (
            <li key={item.href}>
              <button
                type="button"
                onClick={() => go(item.href)}
                className="dash-nav-link"
                style={{ width: '100%', background: 'none', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function UserMenu({ user }: { user: CurrentUser | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const name = user?.fullName ?? '—';
  const initials = (user?.fullName ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('az') ?? '')
    .join('');

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.5rem 0.25rem 0.25rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid transparent',
          background: 'transparent',
          cursor: 'pointer',
          font: 'inherit',
          color: 'var(--color-text-primary)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--color-accent-muted)',
            color: 'var(--color-accent)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials || '?'}
        </span>
        <span className="hidden sm:flex" style={{ flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', lineHeight: 1.2 }}>
            Superadmin
          </span>
        </span>
        <span style={{ color: 'var(--color-text-secondary)' }}>
          <IconChevron open={open} />
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            minWidth: 220,
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '0.5rem',
            zIndex: 40,
          }}
        >
          <div style={{ padding: '0.375rem 0.75rem 0.625rem', borderBottom: '1px solid var(--color-border)', marginBottom: '0.375rem' }}>
            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{name}</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email ?? ''}
            </p>
          </div>
          <NextLink href="/account" className="dash-nav-link" role="menuitem" onClick={() => setOpen(false)}>
            <IconUsers />
            <span>Hesabım</span>
          </NextLink>
          <LogoutButton compact />
        </div>
      ) : null}
    </div>
  );
}

// ─── Shell ───────────────────────────────────────────────────────────────────

export function SuperadminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeHref = resolveActiveHref(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<CurrentUser>('/auth/me')
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        /* Header identity is cosmetic; the layout already authorized this render server-side. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        <div
          style={{
            height: 'var(--admin-header-height)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <NextLink href="/superadmin" style={{ textDecoration: 'none', minWidth: 0 }}>
            <Wordmark />
          </NextLink>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '0.5rem' }}>
          <SidebarNav activeHref={activeHref} />
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', padding: '0.75rem', flexShrink: 0 }}>
          <LogoutButton />
        </div>
      </aside>

      {/* ── Main column ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            height: 'var(--admin-header-height)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0 1rem',
            background: 'var(--color-surface-raised)',
            borderBottom: '1px solid var(--color-border)',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="md:hidden"
            aria-label="Naviqasiya menyusunu aç"
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
            <IconHamburger />
          </button>

          <span className="md:hidden" style={{ minWidth: 0 }}>
            <Wordmark />
          </span>

          <span className="hidden md:flex" style={{ flex: 1, minWidth: 0 }}>
            <HeaderSearch />
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <NextLink
              href="/superadmin/audit-logs"
              aria-label="Son sistem fəaliyyəti"
              title="Son sistem fəaliyyəti"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
              }}
            >
              <IconBell />
            </NextLink>
            <UserMenu user={user} />
          </div>
        </header>

        {/* Pages own their <main> landmark so the shell never nests one. */}
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>

      {/* ── Mobile drawer ── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Platform Admin">
        <SidebarNav activeHref={activeHref} onNavigate={() => setDrawerOpen(false)} />
        <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
          <LogoutButton />
        </div>
      </Drawer>
    </div>
  );
}
