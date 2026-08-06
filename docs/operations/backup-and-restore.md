# Backup and Restore

## Database backups

### Automated backups (managed Postgres)

If using a managed service (Neon, Supabase, RDS, etc.), enable point-in-time recovery (PITR) with:

- Continuous WAL archiving
- Retention: 7 days minimum, 30 days recommended
- Daily snapshot to separate region

### Manual backup (pg_dump)

```bash
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="salonomia-$(date +%Y%m%d-%H%M%S).dump"
```

Store dumps in S3 with versioning enabled. Encrypt at rest (SSE-S3 or SSE-KMS).

### Restore

```bash
# Stop new traffic first (put API in maintenance mode or scale to 0)
pg_restore \
  --dbname="$TARGET_DATABASE_URL" \
  --no-owner \
  --clean \
  salonomia-20260101-120000.dump
# Re-run migrations to ensure schema is current
pnpm --filter @salonomia/database exec prisma migrate deploy
```

### Restore test

Perform a restore test monthly:

1. Restore last backup to a staging DB.
2. Run `pnpm --filter @salonomia/api test` against the restored DB.
3. Verify row counts match production snapshot.
4. Document test date and result.

## Object storage (portfolio images)

S3/R2 versioning should be enabled. The storage bucket does not contain PII beyond image content — back up with standard cross-region replication.

## Critical tables

In order of business impact:

1. `Reservation` + `ReservationStatusHistory` — core business records
2. `User` — customer accounts (PII — encrypt backups)
3. `AuditLog` — compliance record (immutable, high retention)
4. `session` — ephemeral, loss is recoverable (users re-login)
