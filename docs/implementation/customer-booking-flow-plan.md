# Customer Booking UI — Implementation Plan (Section 18)

Authoritative spec: `docs/Salonomia_Optimal_Customer_Reservation_Flow.md`.
Backend contracts today: `GET /public/salons/:slug`, `POST /reservations` (auth),
`GET/PATCH /customer/profile`, customer cancel/reschedule on `POST /reservations/:id/*`.
Gap for 18.3: public availability read endpoint wrapping `computeAvailability()` (15.2 pure engine;
no HTTP surface yet).

## Routes (`apps/web`)

| Route                                        | Step                        | Auth |
| -------------------------------------------- | --------------------------- | ---- |
| `/salons/[slug]`                             | Salon (exists — CTA → book) | no   |
| `/salons/[slug]/book/service`                | Service                     | no   |
| `/salons/[slug]/book/stylist`                | Stylist preference          | no   |
| `/salons/[slug]/book/datetime`               | Date + time                 | no   |
| `/salons/[slug]/book/summary`                | Summary                     | no   |
| `/salons/[slug]/book/confirm`                | Final form + submit         | yes  |
| `/salons/[slug]/book/result/[reservationId]` | Success                     | yes  |

`/book` redirects to `/book/service`. Step guards: missing prior choice → redirect back.
Invalid slug → 404 via public salon fetch.

## Server vs client components

**Server:** step `page.tsx` shells fetch salon context once (`fetchPublicApi /public/salons/:slug`);
pass `{ salonId, slug, name, timezone, services[], employees[], bookingPolicy }` to client step UI.
`generateMetadata` on layout from salon name.

**Client:** `BookingDraftProvider` + per-step interactive UI (service cards, stylist toggle,
date picker, slot grid, summary edits, confirm form, conflict recovery). Shared `BookingStepper`,
`BookingSummaryPanel` (sidebar desktop / collapsible mobile).

## Draft state (`sessionStorage`)

Key: `salonomia:booking-draft:v1:{slug}`. Shape (IDs + preference only — never trusted for price,
duration, tenant, or identity):

```ts
{ serviceId, employeeId: string | null, startAt: ISO8601, idempotencyKey: uuid }
```

`employeeId: null` = any suitable stylist. Re-fetch service/employee labels and price/duration from
public salon payload on every summary/confirm render. Clear draft on successful result. Survives
login/register via `returnTo` (path only, no auth data in URL — `isSafeRedirectPath`).

## Authentication handoff

Summary → Confirm: if `GET /auth/me` fails, show login/register CTAs with
`returnTo=/salons/{slug}/book/confirm`. Existing login/register forms already honor `returnTo`.
Confirm page re-checks session server-side (redirect to login if expired). Customer identity for
`POST /reservations` always from session, never draft.

## API calls by step

| Step     | Call                                                                                      |
| -------- | ----------------------------------------------------------------------------------------- |
| All      | `GET /public/salons/:slug` (server, cache no-store for signed portfolio URLs)             |
| Datetime | `GET /public/salons/:slug/availability?serviceId&date&employeeId?` **(new in 18.3)**      |
| Confirm  | `GET /customer/profile` (prefill name/phone), `POST /reservations`                        |
| Result   | `GET /reservations/:id` **(new customer detail read in 18.5/18.6)** or POST response body |

Submit body: `{ salonId, serviceId, employeeId?, startAt, customerNote?, idempotencyKey }` per
`createReservationSchema`. Terms checkbox UI-only in 18.5 (required before enable submit; marketing
consent separate, maps to profile PATCH if changed).

## Recovery states

- **409 slot conflict:** message + "Pick another time" → datetime (draft keeps service/stylist).
- **Availability stale:** refresh button on datetime; past dates disabled client-side, server authoritative.
- **Salon/service inactive:** error + link back to salon profile or home.
- **Network error on submit:** form preserved, retry; same `idempotencyKey` prevents duplicate booking.
- **Session expired on confirm:** redirect login with `returnTo`, draft intact in sessionStorage.

## Mobile vs desktop (apple-inspired-luxury-web)

**Mobile:** one step per screen; sticky Continue; sticky bottom summary chip; horizontal-safe date
row; min 44px slot buttons; progress stepper compact; back preserves draft.

**Desktop:** two-column — step content left, live `BookingSummaryPanel` right; same step order and
validation; no extra capabilities on desktop.

## Playwright journeys (18.5+, both `mobile` + `desktop` projects)

1. **Happy path (auto-confirm salon):** discovery → salon → book service → any stylist → pick slot
   → summary → register → confirm → CONFIRMED result.
2. **Specific stylist + login handoff:** pick named stylist → summary → login (existing account) →
   confirm → result.
3. **Conflict recovery:** two contexts race same slot → second gets 409 → returns to datetime → picks
   new slot → succeeds.
4. **Draft preservation:** fill through summary → login → land on confirm with selections intact.
5. **Ownership (18.5):** success page for another user's reservationId → denied/not found.

## Slice ownership (prompts 18.2–18.6)

- **18.2:** service + stylist steps, draft write, link from salon CTA.
- **18.3:** availability endpoint + datetime UI (no reservation create).
- **18.4:** summary + auth handoff wiring.
- **18.5:** confirm form, POST, conflict/result, Playwright above.
- **18.6:** `/account/reservations` list/detail + cancel/reschedule.
