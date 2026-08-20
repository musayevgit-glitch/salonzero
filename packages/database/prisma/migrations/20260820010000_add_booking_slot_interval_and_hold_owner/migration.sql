-- Salon-configurable grid spacing for the booking time slots shown to customers.
-- Default 15 preserves the previous hardcoded behaviour for every existing salon.
ALTER TABLE "BookingPolicy"
  ADD COLUMN "bookingSlotIntervalMinutes" INTEGER NOT NULL DEFAULT 15;

-- Ownership for slot holds.
-- Nullable: pre-existing holds have no known owner, and they expire within minutes anyway.
ALTER TABLE "SlotHold"
  ADD COLUMN "heldByUserId" TEXT;

CREATE INDEX "SlotHold_heldByUserId_idx" ON "SlotHold" ("heldByUserId");

ALTER TABLE "SlotHold"
  ADD CONSTRAINT "SlotHold_heldByUserId_fkey"
  FOREIGN KEY ("heldByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
