# MVP Acceptance Criteria

Booking-flow-specific criteria are authoritative in
`docs/Salonomia_Optimal_Customer_Reservation_Flow.md#16-final-acceptance-criteria` — not repeated here.

## Platform-level

- All four roles enforced server-side; denial is default.
- No tenant-owned query executes without an authorized salon scope in the query itself.
- SUPERADMIN cross-salon access is explicit and produces an audit event.
- All client-supplied identity/role/salon/price/duration/status fields are ignored in favor of
  server-derived values.
- Every write to a tenant-owned or security-sensitive resource has a passing authorization test for:
  unauthenticated, wrong role, right role/wrong salon, and correct role/salon.
- Reservation double-booking is prevented at the database/transaction level; a concurrency test proves
  only one of two simultaneous conflicting requests succeeds.
- All timestamps stored in UTC; each salon has an explicit timezone used for display and availability math.
- Mobile (375px), tablet (768px), and desktop (1440px) layouts work without horizontal overflow.
- Loading, empty, error, success, disabled, and permission-denied states exist for every user-facing feature.
- Lint, strict type check, and the relevant test suite pass before a milestone is marked done.
