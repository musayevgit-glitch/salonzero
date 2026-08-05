-- Double-booking prevention (docs/adr/0005-reservation-concurrency.md).
-- Prisma's schema language cannot express EXCLUDE constraints, so this is raw SQL.
--
-- Rollback: ALTER TABLE "Reservation" DROP CONSTRAINT "reservation_no_overlap_per_employee",
-- DROP CONSTRAINT "reservation_start_before_end"; then `prisma migrate resolve --rolled-back
-- 20260805204128_reservation_overlap_exclusion`. btree_gist is left installed (harmless, cheap
-- to keep) rather than dropped, since another migration may depend on it later.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Only "active" statuses can conflict; a rejected/cancelled/no-show reservation must never block
-- a new booking for the same employee/time range.
ALTER TABLE "Reservation"
  ADD CONSTRAINT "reservation_no_overlap_per_employee"
  EXCLUDE USING gist (
    "employeeId" WITH =,
    tstzrange("startAt", "endAt") WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN'));

-- startAt must precede endAt regardless of status.
ALTER TABLE "Reservation"
  ADD CONSTRAINT "reservation_start_before_end"
  CHECK ("startAt" < "endAt");
