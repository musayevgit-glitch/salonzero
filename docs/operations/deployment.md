# Deployment

## Prerequisites

- Node.js ≥ 20, pnpm ≥ 9
- PostgreSQL 15+
- S3-compatible object storage (Cloudflare R2 recommended)
- All environment variables set (see `environment-variables.md`)

## Build

```bash
# From repo root
pnpm install --frozen-lockfile
pnpm --filter @salonomia/validation build   # builds shared packages first
pnpm --filter @salonomia/database build
pnpm --filter @salonomia/ui build
pnpm --filter @salonomia/api build          # NestJS → dist/
pnpm --filter @salonomia/web build          # Next.js → .next/
pnpm --filter @salonomia/dashboard build    # Next.js → .next/
```

## Database migrations

Run migrations **before** starting new API instances.

```bash
pnpm --filter @salonomia/database exec prisma migrate deploy
```

Migration deploys are idempotent. Never run `prisma migrate dev` in production.

## API start

```bash
node apps/api/dist/main.js
```

Or with PM2:

```bash
pm2 start apps/api/dist/main.js --name salonomia-api
```

## Web / Dashboard start

```bash
pnpm --filter @salonomia/web start    # Next.js standalone or pnpm next start
pnpm --filter @salonomia/dashboard start
```

## Health check

`GET /health` → `{ status: "ok" }` — suitable for load balancer health checks.

## Zero-downtime deploy

1. Build new artifacts.
2. Run `prisma migrate deploy` (migration must be backward-compatible with running version).
3. Start new API instances behind load balancer.
4. Drain old instances (30s graceful shutdown).
5. Deploy web and dashboard (Next.js supports rolling).

## Rollback

If a deploy fails:
1. Keep the previous API version running (do not tear down until verified).
2. If migrations ran: run `prisma migrate resolve --rolled-back <migration>` and re-apply the previous migration. Document in the rollback plan.
3. Deploy the previous artifact version.

## Seed data

`pnpm --filter @salonomia/database exec prisma db seed` inserts obviously non-production data (email domains `@example.com`, names like "Extra Salon"). Never run the seed script against production. The seed script checks for `NODE_ENV !== 'production'` before executing.
