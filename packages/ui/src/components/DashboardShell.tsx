'use client';

import { useState, type ReactNode } from 'react';
import { Drawer } from './Drawer';

export interface DashboardNavItem {
  label: string;
  href: string;
  section?: string;
}

export interface DashboardShellProps {
  navItems: DashboardNavItem[];
  activeHref: string;
  children: ReactNode;
  renderLink: (item: DashboardNavItem, isActive: boolean) => ReactNode;
  /** Display name shown in header (e.g. salon name or "Platform Admin") */
  contextLabel?: string;
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 5h14M3 10h14M3 15h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SalonomiaWordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        width="20"
        height="20"
        viewBox="0 0 22 22"
        fill="none"
        aria-hidden="true"
        style={{ color: 'var(--color-accent)' }}
      >
        <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M7 11c0-2.21 1.79-4 4-4s4 1.79 4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="11" cy="14" r="1.5" fill="currentColor" />
      </svg>
      <span
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}
      >
        Salonomia
      </span>
    </span>
  );
}

// Groups nav items by their section label
function groupNavItems(
  items: DashboardNavItem[],
): { section: string | null; items: DashboardNavItem[] }[] {
  const groups: { section: string | null; items: DashboardNavItem[] }[] = [];
  let currentSection: string | null = null;
  let currentGroup: DashboardNavItem[] = [];

  for (const item of items) {
    if (item.section !== currentSection) {
      if (currentGroup.length > 0) groups.push({ section: currentSection, items: currentGroup });
      currentSection = item.section ?? null;
      currentGroup = [];
    }
    currentGroup.push(item);
  }
  if (currentGroup.length > 0) groups.push({ section: currentSection, items: currentGroup });
  return groups;
}

function NavContent({
  navItems,
  renderLink,
  activeHref,
}: {
  navItems: DashboardNavItem[];
  renderLink: DashboardShellProps['renderLink'];
  activeHref: string;
}) {
  const groups = groupNavItems(navItems);
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-0.5 px-3 py-2">
      {groups.map((group, gi) => (
        <div key={gi}>
          {group.section ? <p className="dash-nav-section">{group.section}</p> : null}
          {group.items.map((item) => renderLink(item, item.href === activeHref))}
        </div>
      ))}
    </nav>
  );
}

// Sidebar on desktop, drawer on mobile (docs/design/navigation-model.md).
// Nav items are a UX convenience only — every route re-authorizes server-side regardless of what's rendered.
export function DashboardShell({
  navItems,
  activeHref,
  children,
  renderLink,
  contextLabel,
}: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-surface">
      {/* Desktop sidebar */}
      <aside
        className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface-raised md:flex"
        style={{ boxShadow: '1px 0 0 var(--color-border)' }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border px-5">
          <SalonomiaWordmark />
        </div>

        {/* Context label (e.g. salon name) */}
        {contextLabel ? (
          <div className="border-b border-border px-5 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
              {contextLabel}
            </p>
          </div>
        ) : null}

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-2">
          <NavContent navItems={navItems} renderLink={renderLink} activeHref={activeHref} />
        </div>
      </aside>

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-16 items-center gap-3 border-b border-border bg-surface-raised px-4 md:hidden">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center rounded-[var(--radius-sm)] p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring"
          >
            <HamburgerIcon />
          </button>
          <SalonomiaWordmark />
          {contextLabel ? (
            <span className="ml-2 truncate text-sm text-text-secondary">/ {contextLabel}</span>
          ) : null}
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 md:p-8">{children}</main>
      </div>

      {/* Mobile drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Menu">
        {contextLabel ? (
          <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-text-secondary">
            {contextLabel}
          </p>
        ) : null}
        <NavContent navItems={navItems} renderLink={renderLink} activeHref={activeHref} />
      </Drawer>
    </div>
  );
}
