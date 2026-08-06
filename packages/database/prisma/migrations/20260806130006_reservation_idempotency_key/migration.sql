-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_customerId_idempotencyKey_key" ON "Reservation"("customerId", "idempotencyKey");
