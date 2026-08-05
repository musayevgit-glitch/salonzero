# ADR-0005: Reservation double-booking prevention

## Status

Accepted

## Decision

Prevent overlapping confirmed/held reservations using a database-enforced exclusion constraint
(PostgreSQL `EXCLUDE USING gist` on `(employeeId, tstzrange(startAt, endAt))` for active statuses),
combined with re-checking availability inside the same transaction that inserts the reservation. This is
the primary guarantee, not an application-only overlap check.

## Rationale

Application-level "check-then-insert" without a DB constraint is a known race condition under concurrent
requests. A database exclusion constraint makes double-booking impossible regardless of application bugs;
the in-transaction re-check gives a fast, friendly conflict response instead of relying on a raw
constraint-violation error reaching the user.

## Consequences

Requires the `btree_gist` Postgres extension. Reservation creation/reschedule must run inside a single
transaction that both re-validates availability and performs the insert/update, so the constraint and the
application logic never disagree. A concurrency test (parallel competing booking requests) is required
before Phase 8 is considered done.
