-- Reminder scheduling: the cron job stamps the instant a reminder represents so a re-run can
-- distinguish "already scheduled" from "still to schedule" without re-parsing the JSON payload.
-- Rollback: DROP INDEX "Notification_userId_createdAt_idx", "Notification_scheduledAt_idx";
--           ALTER TABLE "Notification" DROP COLUMN "scheduledAt";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "scheduledAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "Notification_scheduledAt_idx" ON "Notification"("scheduledAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
