# Design Principles

Direction: modern, luxurious, simple, calm, premium, beauty-oriented. Not flashy, not generic AI-SaaS,
not an Apple imitation — see `.claude/skills/apple-inspired-luxury-web/SKILL.md` for the full rationale
(source of truth; not repeated here).

## Color semantics (roles before hex values)

Tokens are named by role, not appearance, so the palette can change without touching components:

- `surface` — page/card background (neutral, calm).
- `surface-raised` — elevated surface (dialogs, popovers).
- `border` — default hairline border.
- `text-primary` / `text-secondary` — main and de-emphasized text.
- `accent` — the single primary brand accent (buttons, links, active states). Exactly one.
- `success` / `warning` / `danger` — status semantics, never used for branding.
- `focus-ring` — visible keyboard focus indicator, always high contrast.

Status is never conveyed by color alone (see accessibility rules) — always paired with an icon or label.

## Typography

One type scale, limited weights (regular/medium/semibold), tabular numbers for prices/reports.
Headings scale responsively; body text stays readable at 320px without zooming.

## Spacing and density

Generous whitespace on public pages; denser, operationally efficient spacing in dashboards — same
underlying spacing scale, different composition, not a second design system.

## Motion

Fast, subtle, interruptible, off under `prefers-reduced-motion`. Motion communicates state change
(e.g. a dialog opening), never decoration.
