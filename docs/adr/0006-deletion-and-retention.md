# ADR-0006: Soft delete for business entities, hard delete blocked by FK Restrict

## Status

Accepted

## Decision

Salons, Users, Services, and EmployeeProfiles are soft-deleted (a status flag), never hard-deleted by
application code. Foreign keys from `Reservation` to `Salon`/`Service`/`EmployeeProfile`/`User` use
`Restrict`, so the database itself refuses a hard delete that would orphan reservation history.
`AuditLog` and `ReservationStatusHistory` are append-only and immutable at the application layer.

## Rationale

Reservations are financial and audit-relevant records; losing them to a cascading delete would break
reporting, audit trails, and potentially customer disputes. Soft delete (suspend/deactivate) covers every
MVP product requirement (hide a salon, deactivate a service/employee) without needing hard delete at all.
`Restrict` FKs make this a database-enforced guarantee, not just an application convention that a future
bug could bypass.

## Alternatives considered

- Cascading hard delete: rejected — silently destroys business/audit history.
- Soft delete everywhere including audit/history: unnecessary — those tables are already append-only by
  contract and have no "active/inactive" concept to soft-delete.

## Consequences

A genuine data-retention/erasure job (e.g. GDPR-style erasure request) is out of MVP scope and would need
its own ADR — noted as an open decision in `docs/product/open-decisions.md` if it becomes a requirement.
`AuditLog`/`ReservationStatusHistory` intentionally have no FK to the entities they reference where that
FK would prevent the referenced row's own soft-delete-then-eventual-hard-delete path (see
`docs/architecture/data-model.md` → AuditLog), so audit history outlives the things it describes.
