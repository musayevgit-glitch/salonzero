# Tenant Isolation

Strategy: shared database, shared schema, discriminator column (see
[ADR-0002](../adr/0002-multi-tenancy.md)).

Rules (see also CLAUDE.md → Security):

- Every tenant-owned Prisma model has a required `salonId` column with an FK to `Salon`.
- The authorized `salonId` comes only from the resolved session + active `SalonMembership` row (or the
  SUPERADMIN audited context-entry action) — never from a request body, query string, or route param.
- All tenant-owned Prisma queries include `salonId` in the `where` clause. Reviewers (see
  `.claude/skills/secure-feature/SKILL.md`) must reject any "fetch by id, then check tenant" pattern.
- SUPERADMIN bypass is a distinct, explicitly-audited code path (`AuditModule` write on context entry),
  not a silent "if SUPERADMIN, skip the salonId filter" branch scattered through modules.
- Composite indexes are `(salonId, ...)` for every tenant-scoped query path (see
  `docs/architecture/data-model.md`, created in Phase 3).
