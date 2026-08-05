# Salonomia — Product Specification (MVP)

Source of truth: `docs/Salonomia_Final_Claude_Code_Playbook.md` (security/architecture) and
`docs/Salonomia_Optimal_Customer_Reservation_Flow.md` (authoritative booking flow). This document
does not repeat their rules — see [role-permission-matrix.md](role-permission-matrix.md),
[user-flows.md](user-flows.md), [acceptance-criteria.md](acceptance-criteria.md),
[out-of-scope.md](out-of-scope.md), [open-decisions.md](open-decisions.md).

## Roles
SUPERADMIN, SALON_ADMIN, SALON_MANAGER, CUSTOMER — full capabilities in the permission matrix.

## MVP feature set

**Public / Customer**
- Salon discovery: list, search, filter (location, service, price, rating, availability, gender focus), sort.
- Salon profile: info, hours, services, stylists, portfolios, reviews, policies.
- Booking flow: service → stylist (specific or "any suitable") → date/time → summary → auth → confirm → result.
- Customer account: profile, upcoming/pending/completed/cancelled reservations, eligible cancel/reschedule.

**SALON_ADMIN**
- Salon profile, booking policy, employees, portfolios, service categories & services, schedules/breaks/time-off,
  manager membership invites, salon customers (operational), salon-scoped reports.

**SALON_MANAGER**
- Reservation operations only: list/search, manual create, confirm, reject, reschedule, cancel, check-in,
  complete, no-show.

**SUPERADMIN**
- Salon CRUD, suspend/restore, domain/subdomain management, membership management, audited salon-context
  entry, platform + per-salon reports, audit log inspection.

**Cross-cutting**
- Audit logging for security/business-critical actions.
- Notifications for reservation lifecycle events.
- Reservation status history.

## Out of scope for MVP
See [out-of-scope.md](out-of-scope.md) (payments, payroll, marketplace commissions, loyalty, chat, native apps, AI features).

## Timezone
Each salon stores an explicit IANA timezone. All timestamps persist in UTC; conversion happens only at
presentation boundaries.
