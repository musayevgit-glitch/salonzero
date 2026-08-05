# Authorization (Phase 10)

Centralized RBAC + tenant-aware policy, per [ADR-0004](../adr/0004-authorization.md) and
[tenant-isolation.md](../architecture/tenant-isolation.md). This phase implements the reusable
guards/policy functions only — no business CRUD routes.

## Deny-by-default guard order

Every protected route runs, in this order (matches
[component-boundaries.md](../architecture/component-boundaries.md)):

1. `AuthenticatedGuard` (Phase 4) — session valid, `User.status === 'ACTIVE'`.
2. `RolesGuard` (this phase) — resolves the caller's _effective role for the specific salon named in
   the route_, or the platform-wide SUPERADMIN role, and checks it against `@Roles(...)` metadata.
3. Route handler — every tenant-owned Prisma query still includes `salonId` in its `where` clause;
   the guard passing does not exempt the query from also being scoped (defense in depth).

Absence of an explicit `@Roles(...)` decorator denies by default (fails closed) rather than allowing
any authenticated user through — the guard's default branch is "deny," not "allow."

## Effective role resolution (never trust the client)

`RolesGuard` never reads role/salonId from the request body or query string. For a route shaped like
`/salons/:salonId/...`:

1. If `user.isSuperadmin`: allowed for any role check that includes `SUPERADMIN`, **and every such
   access is written to `AuditLog`** (`action: 'superadmin.context_entry'`) — this is the sole bypass
   path, implemented once in `RolesGuard`, not reimplemented per module.
2. Otherwise: look up `SalonMembership` for `(userId, salonId from the route param)`. It must exist,
   have `status === 'ACTIVE'`, and its `role` must be in the route's required roles. `salonId` in the
   URL is just an identifier here — the guard still queries the database to confirm the relationship;
   it is never taken on trust the way an unscoped query would.
3. `CUSTOMER` routes (no `:salonId` in the path) instead check **resource ownership**: the resolved
   `customerId` on the target row must equal `req.user.id`. Ownership is checked in the query itself
   (`where: { id, customerId: req.user.id }`), not fetched-then-compared, so a wrong ID and a
   not-owned ID are indistinguishable to the caller.

## Denial responses (no existence leakage)

- No session / expired session → `401`.
- Authenticated but wrong role, inactive membership, wrong salon, or non-owned resource → `404`, not
  `403`. A `403` would confirm the resource exists in a tenant the caller can't see; `404` does not
  distinguish "doesn't exist" from "not yours" (docs/architecture/error-handling.md).

## Policy summary by role

| Role          | Scope resolution                                                                                                                                                                                                 | Denial on                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| SUPERADMIN    | Always allowed where `@Roles('SUPERADMIN')` is present; every use audited.                                                                                                                                       | Never denied by `RolesGuard` itself — a missing `SUPERADMIN` entry in `@Roles(...)` denies same as anyone else. |
| SALON_ADMIN   | Active `SalonMembership(userId, :salonId)` with `role: SALON_ADMIN`.                                                                                                                                             | No membership, suspended membership, or membership role is `SALON_MANAGER` on an admin-only route.              |
| SALON_MANAGER | Active `SalonMembership(userId, :salonId)` with `role: SALON_MANAGER` (or `SALON_ADMIN`, which is a superset for reservation operations per the [role-permission-matrix](../product/role-permission-matrix.md)). | No membership, suspended membership.                                                                            |
| CUSTOMER      | `customerId` on the row equals `req.user.id`; no membership check (customers have none).                                                                                                                         | Row belongs to a different customer, or doesn't exist.                                                          |

## Test matrix (implemented as `RolesGuard`/policy unit + integration tests)

For every guarded scenario: unauthenticated, wrong role, right role/wrong salon, suspended
membership, forged `salonId` in body (ignored — only the route param + DB lookup matter), guessed
resource ID, SUPERADMIN bypass (allowed + audited), SUPERADMIN bypass on a route that doesn't declare
`SUPERADMIN` (denied like anyone else — bypass is scoped per-route, not global).
