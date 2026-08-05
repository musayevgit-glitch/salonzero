# Responsive Strategy

Breakpoints (Tailwind defaults, used consistently across both apps): `sm` 640px, `md` 768px,
`lg` 1024px, `xl` 1280px, `2xl` 1440px. Design/test checkpoints per CLAUDE.md: 320px, 375px, 768px,
1024px, 1440px.

## Content widths

- Public marketing/discovery content: max-width `2xl` container (~1280px), centered, fluid below that.
- Dashboard: full-width layout with sidebar; content area caps long-form text at ~720px for readability,
  tables/lists use full available width.

## Table → mobile list

Any data table wider than ~4 columns gets a mobile alternative: each row becomes a card showing the
1-2 most important fields plus a "view details" action, rather than a horizontally scrolling table.
Never truncate the primary identifying field (name) — truncate secondary columns first.

## Sticky elements

Booking flow's "continue" action and the mobile drawer trigger may be sticky; sticky elements must never
cover more than ~15% of viewport height and must not obscure the field currently being edited (keyboard
open on mobile).

## Long text

Azerbaijani and English strings are tested at their longest realistic length (e.g. long salon/service
names) at 320px; layouts wrap, they do not overflow or get clipped.
