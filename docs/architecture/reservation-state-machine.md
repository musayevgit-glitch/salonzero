# Reservation State Machine (Section 15.1)

Documentation only — no endpoints exist yet. This is the specification that Sections 15.3–15.5's
implementation must match exactly, and that Section 15.6's security review audits against.

Source docs read for this: `docs/adr/0005-reservation-concurrency.md`,
`docs/architecture/data-model.md` (Reservation / ReservationStatusHistory / Notification /
BookingPolicy sections), `docs/product/role-permission-matrix.md`,
`docs/Salonomia_Optimal_Customer_Reservation_Flow.md`, `packages/database/prisma/schema.prisma`
(`ReservationStatus` enum, `Reservation`, `ReservationStatusHistory`).

## States

`PENDING`, `CONFIRMED`, `REJECTED`, `CANCELLED_BY_CUSTOMER`, `CANCELLED_BY_SALON`, `CHECKED_IN`,
`COMPLETED`, `NO_SHOW` — exactly the `ReservationStatus` enum, no additional states.

Terminal states (no transition out of them, ever): `REJECTED`, `CANCELLED_BY_CUSTOMER`,
`CANCELLED_BY_SALON`, `COMPLETED`, `NO_SHOW`.

## Transition table

| From                     | To                                     | Actor(s)                                                | Preconditions                                                                                                                                                                                                                      | Side effects                                                                                                                                                                                                                                                                                                                                                                                           | Audit event                         | Notification event                                                                         |
| ------------------------ | -------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| _(create)_               | `PENDING`                              | CUSTOMER, SALON_MANAGER/SALON_ADMIN (manual)            | Salon/service/employee active + tenant-matched; employee eligible for service; slot free (transactional re-check); within `minNoticeMinutes`/`maxAdvanceDays`; `BookingPolicy.autoConfirm = false`                                 | Reservation row created; `ReservationStatusHistory` row (`fromStatus: null → toStatus: PENDING`)                                                                                                                                                                                                                                                                                                       | `reservation.created`               | `reservation.pending_customer` (to customer), `reservation.pending_salon` (to salon staff) |
| _(create)_               | `CONFIRMED`                            | CUSTOMER, SALON_MANAGER/SALON_ADMIN (manual)            | Same as above, plus `BookingPolicy.autoConfirm = true`                                                                                                                                                                             | Reservation row created; history row (`null → CONFIRMED`)                                                                                                                                                                                                                                                                                                                                              | `reservation.created`               | `reservation.confirmed` (to customer)                                                      |
| `PENDING`                | `CONFIRMED`                            | SALON_MANAGER, SALON_ADMIN, SUPERADMIN (audited bypass) | Reservation belongs to actor's salon; still `PENDING` (idempotency: confirming an already-`CONFIRMED` reservation is a no-op, not an error — see below)                                                                            | History row (`PENDING → CONFIRMED`)                                                                                                                                                                                                                                                                                                                                                                    | `reservation.confirmed`             | `reservation.confirmed` (to customer)                                                      |
| `PENDING`                | `REJECTED`                             | SALON_MANAGER, SALON_ADMIN, SUPERADMIN                  | Reservation belongs to actor's salon; still `PENDING`                                                                                                                                                                              | Slot released (exclusion constraint no longer applies — `REJECTED` is not an active status); history row; optional `reason`                                                                                                                                                                                                                                                                            | `reservation.rejected`              | `reservation.rejected` (to customer)                                                       |
| `PENDING` \| `CONFIRMED` | `CANCELLED_BY_CUSTOMER`                | CUSTOMER (own reservation only)                         | Reservation belongs to actor; `now < startAt - cancellationWindowHours` (per `BookingPolicy`); not already terminal                                                                                                                | Slot released; history row; optional `reason`                                                                                                                                                                                                                                                                                                                                                          | `reservation.cancelled_by_customer` | `reservation.cancelled` (to customer + salon staff)                                        |
| `PENDING` \| `CONFIRMED` | `CANCELLED_BY_SALON`                   | SALON_MANAGER, SALON_ADMIN, SUPERADMIN                  | Reservation belongs to actor's salon; not already terminal (salon-side cancellation is not subject to the customer cancellation window — salon can cancel any time, e.g. employee no longer available)                             | Slot released; history row; optional `reason`                                                                                                                                                                                                                                                                                                                                                          | `reservation.cancelled_by_salon`    | `reservation.cancelled` (to customer)                                                      |
| `PENDING` \| `CONFIRMED` | _(rescheduled: new `startAt`/`endAt`)_ | CUSTOMER (own, per policy) or SALON_MANAGER/SALON_ADMIN | Not already terminal; `now < startAt - rescheduleWindowHours` for CUSTOMER-initiated (no window restriction for salon-initiated); new slot re-validated exactly like creation (availability engine + transactional conflict check) | Old slot released and new slot acquired **in the same transaction** (never two separate transactions — a gap between them is a double-booking window); history row records the reschedule as a `reason`-annotated same-status transition (`CONFIRMED → CONFIRMED` or `PENDING → PENDING`) with the old/new times in `reason`/metadata, not a status change; status itself is unchanged by rescheduling | `reservation.rescheduled`           | `reservation.rescheduled` (to customer + salon staff)                                      |
| `CONFIRMED`              | `CHECKED_IN`                           | SALON_MANAGER, SALON_ADMIN, SUPERADMIN                  | Reservation belongs to actor's salon; status is `CONFIRMED` (not `PENDING` — an unconfirmed reservation cannot be checked in)                                                                                                      | History row                                                                                                                                                                                                                                                                                                                                                                                            | `reservation.checked_in`            | none (internal operational state, not customer-facing)                                     |
| `CHECKED_IN`             | `COMPLETED`                            | SALON_MANAGER, SALON_ADMIN, SUPERADMIN                  | Reservation belongs to actor's salon; status is `CHECKED_IN`                                                                                                                                                                       | `completedAt` set; history row                                                                                                                                                                                                                                                                                                                                                                         | `reservation.completed`             | `reservation.completed` (to customer — receipt/review-prompt trigger)                      |
| `CONFIRMED`              | `NO_SHOW`                              | SALON_MANAGER, SALON_ADMIN, SUPERADMIN                  | Reservation belongs to actor's salon; status is `CONFIRMED`; `now > endAt` (cannot mark no-show for a reservation whose time hasn't passed yet)                                                                                    | History row                                                                                                                                                                                                                                                                                                                                                                                            | `reservation.no_show`               | none                                                                                       |

## Actor permissions summary

- **CUSTOMER**: create own (`PENDING`/`CONFIRMED` per policy); cancel own, per cancellation window;
  reschedule own, per reschedule window. Never: confirm, reject, check-in, complete, mark no-show, or
  act on another customer's reservation (ownership is `Reservation.customerId === session user id`,
  checked server-side, never trusted from the client).
- **SALON_MANAGER / SALON_ADMIN**: full transition set _within their assigned salon only_
  (`Reservation.salonId` must match the authorized `SalonContext.salonId` resolved by `RolesGuard` —
  never a client-supplied salonId). Manual creation on behalf of a customer.
- **SUPERADMIN**: same as SALON_MANAGER/SALON_ADMIN, via the existing audited bypass branch in
  `RolesGuard` (`superadmin.context_entry`) — every action still audited with the real actor, not
  a generic "system" actor.
- **No role** may set `priceAmount`, `currency`, `customerId`, `salonId`, `createdAt`, or
  `completedAt` directly — these are always server-derived (price/currency snapshotted from
  `Service` at creation time; `customerId` from session; `salonId` from the authorized route
  context; timestamps from the server clock).

## Illegal transitions (must be rejected, not silently ignored)

- Any transition **from** a terminal state (`REJECTED`, `CANCELLED_BY_CUSTOMER`,
  `CANCELLED_BY_SALON`, `COMPLETED`, `NO_SHOW`) to anywhere.
- `PENDING → CHECKED_IN` (must be confirmed first).
- `PENDING → COMPLETED` (must be confirmed and checked in first).
- `PENDING → NO_SHOW` (a reservation that was never confirmed cannot be marked as a no-show).
- `CONFIRMED → PENDING` (no "un-confirm" transition; the only way back is `CANCELLED_BY_SALON` or
  `CANCELLED_BY_CUSTOMER`).
- Any transition where the reservation's `salonId` does not match the actor's authorized
  `SalonContext.salonId`, or (for CUSTOMER) `customerId` does not match the session user.
- A customer attempting to cancel/reschedule outside the configured window (`cancellationWindowHours`
  / `rescheduleWindowHours`), or a customer attempting any salon-only transition
  (confirm/reject/check-in/complete/no-show).
- Rejecting a reservation that is not `PENDING` (a `CONFIRMED` reservation must be cancelled, not
  rejected — `REJECTED` is reserved for the pending-approval decision point only).

Illegal transitions return a client error (409 for a real state conflict, 404 for
authorization/ownership failures — consistent with the existing "404, not 403" cross-tenant policy)
and must **not** silently no-op or partially apply.

## Idempotency behavior

- **Confirming an already-`CONFIRMED` reservation**: no-op success (200, unchanged reservation, no
  new history row, no duplicate notification) — this is the one deliberate exception to "illegal
  transitions must be rejected," because a manager double-clicking "Confirm" (or a retried request
  after a network timeout) must not be treated as an error. Re-confirming is idempotent by
  definition since it doesn't change any state.
- **Rejecting an already-`REJECTED` reservation**: same idempotent no-op treatment as confirm.
- **All other repeated transition requests** (e.g., cancel-then-cancel-again, check-in twice) hit an
  illegal-transition error on the second attempt, since the reservation is now in a different
  (terminal, or already-transitioned) state than the precondition requires — this is naturally
  idempotent-safe (repeating the request never changes anything beyond the first successful call)
  without needing special-cased no-op handling.
- **Duplicate reservation creation** (double-submit): prevented by the client sending an
  idempotency key (e.g., a client-generated UUID stored alongside the reservation, unique per
  customer+key) so a retried creation request returns the original reservation instead of creating a
  second one — exact mechanism is an implementation detail for Section 15.3, not re-specified here,
  but the requirement itself (no duplicate booking from a double-click or retry) is locked in now.

## Concurrency guarantee (restates ADR-0005, does not change it)

Every transition that touches `startAt`/`endAt`/`employeeId` (creation and reschedule) must run
inside a single database transaction that re-validates availability immediately before the write,
relying on the `EXCLUDE USING gist` constraint on `(employeeId, tstzrange(startAt, endAt))` for
active statuses as the actual guarantee — the in-transaction check exists to produce a clean 409
instead of surfacing a raw constraint-violation error, not as a substitute for the constraint.
Transitions that don't touch time/employee (confirm, reject, cancel, check-in, complete, no-show) do
not need this — a plain `UPDATE ... WHERE id = ? AND status = ?` (checking the precondition status in
the same statement) is sufficient to make them safe under concurrent requests, since two concurrent
"confirm" calls against the same row will have exactly one succeed in changing the row and the other
observe zero rows affected (treated as the idempotent no-op case above, not an error).
