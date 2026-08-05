# ADR-0002: Multi-tenancy via shared schema + discriminator column

## Status
Accepted

## Decision
One Postgres database, one schema, every tenant-owned table carries a required `salonId` column (FK to
`Salon`). All application queries scope by `salonId`; no schema-per-tenant, no database-per-tenant.

## Rationale
MVP scale does not justify per-tenant database/schema operational overhead (migrations × N tenants,
connection pooling complexity). A discriminator column with centralized authorization guards
(see [tenant-isolation.md](../architecture/tenant-isolation.md)) gives strong isolation at much lower
operational cost, and is the conventional choice for this stack (Prisma + NestJS).

## Alternatives considered
- Schema-per-tenant: stronger physical isolation, much higher migration/ops complexity — deferred unless
  a compliance requirement forces it later (would need its own ADR).
- Database-per-tenant: rejected for MVP scale, revisit only if a customer requires physical isolation.

## Consequences
Correctness depends entirely on disciplined query scoping; enforced via the `secure-feature` skill's
required test matrix (wrong role, right role/wrong salon, etc.) on every tenant-owned endpoint.
