-- Add cover photo and logo URL fields to Salon
ALTER TABLE "Salon" ADD COLUMN "coverUrl" TEXT;
ALTER TABLE "Salon" ADD COLUMN "logoUrl" TEXT;
