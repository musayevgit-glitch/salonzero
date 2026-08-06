# Monitoring

## Health endpoint

`GET /health` — responds `{ status: "ok" }` with HTTP 200. Use as load balancer health check (every 10s, 2 failures → remove from pool).

## Key metrics to alert on

| Metric | Threshold | Severity |
|---|---|---|
| API P95 response time | > 2000ms | warning |
| API error rate (5xx) | > 1% over 5m | critical |
| Database connection pool saturation | > 80% | warning |
| Failed login rate | > 20/min per IP | critical (possible brute force) |
| Reservation creation 409 conflict rate | > 10% of attempts | warning (slot contention) |
| Storage upload failure rate | > 5% | warning |

## Audit log retention

`AuditLog` rows are append-only and must be retained for ≥ 2 years. Set up a periodic export to cold storage (e.g. S3 Glacier) for rows older than 90 days if the primary DB grows large.

## Session table

`session` table (managed by `connect-pg-simple`) accumulates stale rows. Run the built-in cleanup:

```sql
-- connect-pg-simple does this automatically when `disableTouch: false` (default)
-- To prune manually:
DELETE FROM session WHERE expire < NOW();
```

Schedule this as a daily cron job.

## Log format

API logs use NestJS default structured JSON. Ensure the following fields are always present and never contain secrets:

- `level`, `timestamp`, `context`, `message`
- `requestId` (add via middleware if not present)

Never log: passwords, `SESSION_SECRET`, `LOCAL_STORAGE_SIGNING_SECRET`, raw session cookies, full request bodies on auth endpoints.

## Error tracking

Configure Sentry (or equivalent) with:
- `tracesSampleRate: 0.1` (adjust per traffic)
- `beforeSend` hook to strip PII from breadcrumbs
- Separate DSNs for API, web, and dashboard so alerts are scoped
