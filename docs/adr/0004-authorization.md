# ADR-0004: Centralized RBAC + tenant-aware policy functions

## Status

Accepted

## Decision

Authorization is centralized in `packages/auth`: role checks (RBAC) plus tenant-aware policy functions
that resolve the authorized `salonId` from the session/membership, exposed to NestJS as guards +
decorators. No controller/service computes its own ad-hoc permission logic.

## Rationale

Four roles with tenant scoping and a SUPERADMIN override need one enforced code path to avoid drift
(the exact bug class IDOR/BOLA findings come from). Centralizing also makes the guard order
(see [component-boundaries.md](../architecture/component-boundaries.md)) auditable in one place.

## Consequences

Every new protected endpoint must use the shared guard/decorator, not a bespoke check — enforced by
`security-reviewer` findings and the `secure-feature` skill's required test list.
