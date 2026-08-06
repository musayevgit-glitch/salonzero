-- SEC-012/016: store the canonical request fingerprint for idempotency keys.
-- Rollback: drop the two idempotency metadata columns; duplicate prevention reverts to key-only.

ALTER TABLE "Reservation" ADD COLUMN "idempotencyPayloadHash" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "idempotencyExpiresAt" TIMESTAMPTZ(3);
