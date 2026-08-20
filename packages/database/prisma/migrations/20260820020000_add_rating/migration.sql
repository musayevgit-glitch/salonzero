-- One rating per completed reservation. The unique index on "reservationId" is the invariant
-- that stops a customer submitting twice for the same visit; the CHECK constraint keeps the
-- 1..5 range enforced in the database rather than only at the API boundary.
-- Rollback: DROP TABLE "Rating";

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rating_reservationId_key" ON "Rating"("reservationId");

-- CreateIndex
CREATE INDEX "Rating_salonId_createdAt_idx" ON "Rating"("salonId", "createdAt");

-- CreateIndex
CREATE INDEX "Rating_customerId_createdAt_idx" ON "Rating"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Rating_salonId_stars_idx" ON "Rating"("salonId", "stars");

-- Range invariant enforced by the database, not only by request validation.
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_stars_range" CHECK ("stars" BETWEEN 1 AND 5);

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
