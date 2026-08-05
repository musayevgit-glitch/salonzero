# System Overview

Salonomia is a multi-tenant SaaS: one Postgres database, shared schema, `salonId` column on every
tenant-owned table (row-level tenancy — see [ADR-0002](../adr/0002-multi-tenancy.md)).

Three deployable units, one monorepo (pnpm workspaces + Turborepo, [ADR-0001](../adr/0001-monorepo.md)):

- **apps/web** — Next.js App Router, public discovery + customer booking + customer account.
- **apps/dashboard** — Next.js App Router, SUPERADMIN / SALON_ADMIN / SALON_MANAGER screens.
- **apps/api** — NestJS, all domain logic, authorization, persistence, the only writer to Postgres.

Both Next.js apps are thin: they call the API over HTTP (internal network in prod), they do not talk to
Postgres directly. This keeps authorization and tenant scoping in one place.

Shared packages: `packages/database` (Prisma schema/client), `packages/validation` (Zod schemas),
`packages/auth` (shared auth/session types + policy helpers), `packages/contracts` (API request/response
types), `packages/ui`, `packages/config`.

No queues, no Redis, no microservices in MVP — see "Avoid speculative infrastructure" in CLAUDE.md.
