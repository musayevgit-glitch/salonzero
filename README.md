# Salonomia

Multi-tenant salon discovery, management, and reservation platform. See
`docs/Salonomia_Final_Claude_Code_Playbook.md` for the authoritative playbook and `CLAUDE.md` for
working rules.

## Stack

Next.js (web, dashboard) + NestJS (api) + PostgreSQL/Prisma + Zod, in a pnpm/Turborepo monorepo.

## Setup

```bash
cp .env.example .env      # fill in real values; never commit .env
docker compose up -d      # starts PostgreSQL
pnpm install
pnpm --filter @salonomia/database generate
pnpm dev                  # runs web (:3000), dashboard (:3001), api (:4000) in parallel
```

## Common commands

```bash
pnpm build        # production build, all apps/packages
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm test:e2e      # Playwright; run `pnpm exec playwright install` once first
```

## Repository layout

See `docs/Salonomia_Final_Claude_Code_Playbook.md` §1 for the full structure rationale.

## Progress

Current implementation status: `docs/implementation/progress.md`.
