# ADR-0007: Design system — Tailwind CSS + Radix primitives, tokens-first

## Status

Accepted

## Decision

Build `packages/ui` on Tailwind CSS (utility styling, shared Tailwind config/tokens) plus Radix UI
primitives for components with real accessibility complexity (dialog, dropdown menu, tabs, checkbox,
radio group, toast). Native HTML elements (button, input, textarea, select) are used directly with
Tailwind styling rather than wrapped in a heavier library, since native elements already carry correct
semantics and keyboard behavior.

## Rationale

Tailwind matches the stack decision and keeps styling co-located with markup without a separate CSS
build per app. Radix gives WAI-ARIA-correct focus management, keyboard handling, and portal/positioning
for the handful of components (dialogs, menus) where hand-rolling accessibility correctly is genuinely
hard and easy to get subtly wrong. This is the "accessible headless primitives" stack decision from the
playbook, not a new dependency category.

## Alternatives considered

- A full component library (e.g. MUI, Chakra): rejected — brings its own design language fighting the
  "not generic AI-SaaS" direction, and much larger bundle/override surface than needed.
- Hand-rolled dialog/menu accessibility: rejected — focus trapping, portal rendering, and ARIA wiring are
  easy to get wrong and hard to test exhaustively; Radix is a small, well-audited dependency for exactly
  this.

## Consequences

Design tokens live in `packages/ui/src/tokens.css` (CSS custom properties) and are referenced from each
app's Tailwind config (`packages/ui` is a shared Tailwind preset). Any new component color/spacing value
must be a token reference, not a one-off Tailwind arbitrary value, per the apple-inspired-luxury-web
skill's "no unexplained one-off visual values" rule.
