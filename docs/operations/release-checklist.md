# Release Checklist

Check every item before promoting a build to production.

## Code quality

- [ ] `pnpm --filter @salonomia/validation build` passes
- [ ] `pnpm --filter @salonomia/api exec tsc --noEmit` passes
- [ ] `pnpm --filter @salonomia/web exec tsc --noEmit` passes
- [ ] `pnpm --filter @salonomia/dashboard exec tsc --noEmit` passes
- [ ] Full API test suite: `env $(cat .env.test | xargs) pnpm --filter @salonomia/api test` — all tests pass, 0 skipped
- [ ] No `console.log` of secrets, tokens, or PII in diff

## Security

- [ ] No new endpoints without `@UseGuards(AuthenticatedGuard, RolesGuard)` + `@Roles(...)`
- [ ] No client-supplied identity, salon ID, price, duration, or status trusted without re-derivation
- [ ] All new DB queries include `salonId` scope on tenant-owned records
- [ ] No `.strict()` removed from Zod schemas
- [ ] CORS origins list is correct for the target environment
- [ ] `SESSION_SECRET` and `LOCAL_STORAGE_SIGNING_SECRET` are production-grade random values (not dev defaults)
- [ ] No seed data can be triggered in production (`NODE_ENV` guard checked)

## Database

- [ ] `prisma migrate deploy` runs cleanly against a staging DB snapshot
- [ ] Rollback plan documented for any new migration
- [ ] No `prisma migrate dev` or `prisma db push` in production pipeline

## Observability

- [ ] Health endpoint (`GET /health`) returns 200
- [ ] Error tracking configured (Sentry DSN or equivalent)
- [ ] Structured logs flowing to log aggregator
- [ ] Alert on P95 latency > 2s and error rate > 1%

## Build artifacts

- [ ] `pnpm --filter @salonomia/api build` produces `dist/main.js`
- [ ] `pnpm --filter @salonomia/web build` succeeds (no `export default` missing, no ISR errors)
- [ ] `pnpm --filter @salonomia/dashboard build` succeeds
- [ ] No development-only endpoints or routes exposed (`/dev/*`, `/showcase`)

## Post-deploy smoke test

- [ ] `GET /health` → 200
- [ ] Public discovery page (`/salons`) loads
- [ ] Login flow completes
- [ ] Superadmin can list salons (`GET /superadmin/salons`)
- [ ] Customer can start booking flow on at least one salon
