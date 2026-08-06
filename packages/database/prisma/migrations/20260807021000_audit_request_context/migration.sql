-- SEC-020: retain minimal request context for audit investigations.
-- Rollback: drop the three nullable request-context columns.

ALTER TABLE "AuditLog" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "requestId" TEXT;
