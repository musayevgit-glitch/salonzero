# Navigation Model

## Public site (apps/web)

Desktop: top header (logo, discovery link, login/account). Mobile: same header, collapses secondary
links into a menu button; no bottom tab bar in MVP (browsing-first, not app-like).

## Customer account (apps/web, authenticated)

Simple horizontal tabs (Upcoming / Pending / History) under the account header; same component on
mobile and desktop — no separate mobile nav needed at this depth.

## Superadmin (apps/dashboard)

Desktop: persistent left sidebar (Salons, Audit). Mobile: sidebar collapses to a drawer opened by a
header menu button.

## Salon Admin / Salon Manager (apps/dashboard)

Desktop: persistent left sidebar, items filtered by role (Salon Manager sees only Reservations).
Mobile: same drawer pattern as superadmin. Manager's reduced nav is a UX convenience — the
role-permission matrix is what actually blocks the other routes server-side.

## Shared rules

- Active route is always visually indicated (not color-only — also weight/underline).
- Breadcrumbs appear only below the top navigation level (list → detail → edit), never duplicating the
  sidebar.
- Drawer/menu traps focus and restores it to the trigger on close.
