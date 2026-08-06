-- AlterTable: snapshot manager-supplied customer name onto manual reservations (SEC-002)
-- Prevents cross-tenant account-existence enumeration through the staff reservation detail endpoint.
ALTER TABLE "Reservation" ADD COLUMN "guestName" TEXT;
