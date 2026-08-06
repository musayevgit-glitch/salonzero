-- SEC-011: persist the reservation's DB-enforced busy span including trailing service buffer.
-- Rollback: drop reservation_no_overlap_per_employee, drop Reservation.blockedUntil, recreate the
-- original EXCLUDE constraint on tstzrange(startAt, endAt).

ALTER TABLE "Reservation" ADD COLUMN "blockedUntil" TIMESTAMPTZ(3);

UPDATE "Reservation" r
SET "blockedUntil" = r."endAt" + (s."bufferMinutes" || ' minutes')::interval
FROM "Service" s
WHERE s."id" = r."serviceId";

ALTER TABLE "Reservation"
  ALTER COLUMN "blockedUntil" SET NOT NULL;

ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_blockedUntil_after_endAt_check" CHECK ("blockedUntil" >= "endAt");

ALTER TABLE "Reservation"
  DROP CONSTRAINT "reservation_no_overlap_per_employee";

ALTER TABLE "Reservation"
  ADD CONSTRAINT "reservation_no_overlap_per_employee"
  EXCLUDE USING gist (
    "employeeId" WITH =,
    tstzrange("startAt", "blockedUntil") WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN'));
