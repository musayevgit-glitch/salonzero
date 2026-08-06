# Incident Response

## Severity levels

| Level | Definition | Response time |
|---|---|---|
| P0 — Critical | Full outage, data breach, active exploit | Immediate (<15 min) |
| P1 — High | Booking creation broken, auth broken, data loss risk | <1 hour |
| P2 — Medium | Degraded performance, non-critical feature broken | <4 hours |
| P3 — Low | Cosmetic, single user affected, workaround exists | Next business day |

## P0 playbook (data breach / active exploit)

1. **Contain**: revoke compromised credentials immediately (rotate `SESSION_SECRET` → invalidates all sessions, rotate storage keys).
2. **Assess**: query `AuditLog` to determine scope (`SELECT * FROM "AuditLog" WHERE "createdAt" > NOW() - INTERVAL '24h' ORDER BY "createdAt" DESC`).
3. **Notify**: inform affected users within 72 hours per GDPR/applicable law.
4. **Preserve**: snapshot DB and logs before any cleanup.
5. **Root cause**: document in `docs/security/incidents/YYYY-MM-DD-<slug>.md`.
6. **Regression test**: add an automated test that would have caught the issue.

## P0 playbook (full outage)

1. Check `GET /health` from outside the VPC.
2. Check DB connectivity (`pg_isready -d $DATABASE_URL`).
3. Check API logs for startup errors (missing env var, migration mismatch).
4. Roll back to previous artifact version if deploy caused the outage.

## Runbook: invalidate all sessions

Rotating `SESSION_SECRET` invalidates all active sessions immediately. Use for confirmed credential compromise:

```bash
# Update SESSION_SECRET in secrets manager
# Redeploy API (new secret loaded at startup)
# Announce forced re-login to users
```

## Runbook: block a specific user

```sql
UPDATE "User" SET status = 'SUSPENDED' WHERE id = '<userId>';
```

The `AuthenticatedGuard` checks `user.status` on every request — a suspended user receives 401 immediately.

## Post-incident review

Required for P0/P1 within 5 business days:
- Timeline of events
- Root cause
- Impact (users affected, data at risk)
- Remediation steps taken
- Prevention: code change, process change, or both
- New regression test added: yes / no
