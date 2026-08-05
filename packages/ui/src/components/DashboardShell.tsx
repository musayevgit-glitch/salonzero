'use client';

import { useState, type ReactNode } from 'react';
import { Drawer } from './Drawer';
import { IconButton } from './IconButton';

export interface DashboardNavItem {
  label: string;
  href: string;
}

export interface DashboardShellProps {
  navItems: DashboardNavItem[];
  activeHref: string;
  children: ReactNode;
  renderLink: (item: DashboardNavItem, isActive: boolean) => ReactNode;
}

// Sidebar on desktop, drawer on mobile (docs/design/navigation-model.md). The nav-item list shown here
// is a UX convenience only — every route re-authorizes server-side regardless of what's rendered.
export function DashboardShell({
  navItems,
  activeHref,
  children,
  renderLink,
}: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const nav = (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {navItems.map((item) => renderLink(item, item.href === activeHref))}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-surface">
      <aside className="hidden w-56 shrink-0 border-r border-border p-4 md:block">{nav}</aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-border px-4 md:hidden">
          <IconButton
            label="Open menu"
            icon={<span aria-hidden="true">☰</span>}
            onClick={() => setDrawerOpen(true)}
          />
          <span className="font-semibold text-text-primary">Salonomia</span>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Menu">
        {nav}
      </Drawer>
    </div>
  );
}
