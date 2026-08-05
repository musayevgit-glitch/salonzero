# Data Model (Phase 3)

Prisma schema: `packages/database/prisma/schema.prisma`. Rules below apply platform-wide; only
per-entity specifics are listed under each entity.

**Platform rules:** all tenant-owned tables carry a required `salonId` FK ([ADR-0002](../adr/0002-multi-tenancy.md)).
Money is `Int` minor-currency-units + `currency` string, never float. Business timestamps use
`@db.Timestamptz(3)` (true UTC instants, not naive timestamps). Roles are typed enums, never free-form
strings. Deletion policy detail: [data-retention.md](data-retention.md) / [ADR-0006](../adr/0006-deletion-and-retention.md).

## User

Identity: `id`, `email` (unique). Lifecycle: `status` (ACTIVE/SUSPENDED). Tenant ownership: none —
platform-wide identity; salon access comes only through `SalonMembership`. `isSuperadmin` is an explicit
boolean (not inferred), matching the "SUPERADMIN bypass must be explicit" rule. Uniqueness: `email`.
Deletion: soft (`status = SUSPENDED`); hard delete blocked while reservations/audit rows reference the
user (`Restrict`/no-FK, see below). Audit relevance: actor in most `AuditLog` rows. Privacy: sensitive PII
(email, phone, name).

## PasswordResetToken / SalonInvitation

Added in Phase 4 ([docs/security/authentication.md](../security/authentication.md)). Both store only a
hash of the actual token (never the plaintext), have a required `expiresAt`, and a nullable `usedAt` /
`acceptedAt` marking single-use consumption. `PasswordResetToken.userId` is `Cascade` (meaningless
without its user). `SalonInvitation.salonId` is `Restrict` (matches other salon-owned tables);
`invitedByUserId` is a plain nullable string with no FK, matching `AuditLog`'s "must outlive what it
references" pattern, since an inviter's account could later be suspended/removed without invalidating
history of who sent the invite. Privacy: sensitive (the hash is not secret-equivalent, but the flow is
security-critical) — never returned in any API response.

## SalonMembership

Links `User` ↔ `Salon` with a typed `role` (`SALON_ADMIN` | `SALON_MANAGER`). Tenant ownership: `salonId`.
Lifecycle: `status` (ACTIVE/SUSPENDED). Uniqueness: `(userId, salonId)` — one role per user per salon.
Indexes: `(salonId, role)`. FK: `userId`/`salonId` `Restrict` (a membership never silently outlives its
salon or user). Audit relevance: invite/accept/remove are audited. Privacy: tenant-internal.

## Salon

Identity: `id`, `slug` (unique, public URLs). Lifecycle: `status` (ACTIVE/SUSPENDED) + `deletedAt` (soft
delete). Fields: `timezone` (IANA, required — [tenant-isolation.md](tenant-isolation.md)), `subdomain`
(unique, nullable), `customDomain` (unique, nullable), `genderFocus` (nullable enum). Deletion: soft only
in MVP; hard delete is a documented future job, not code (ADR-0006). Audit relevance: create/suspend/
restore/domain changes. Privacy: public profile fields are public; nothing else on this table is private.

## BookingPolicy

1:1 with `Salon`. Fields: `autoConfirm`, `minNoticeMinutes`, `maxAdvanceDays`, `cancellationWindowHours`,
`rescheduleWindowHours`. Tenant ownership: `salonId` (unique — enforces 1:1). FK: `Restrict`. Privacy:
public (customers need these rules to understand booking behavior).

## ServiceCategory / Service

Tenant ownership: `salonId`. Uniqueness: `ServiceCategory(salonId, name)`. `Service`: `priceAmount` (Int)

- `currency`, `durationMinutes`, `bufferMinutes`, `isActive`. Index: `Service(salonId, isActive)` (the
  active-services-per-salon query path). FK: `categoryId` `SetNull` (deleting a category doesn't delete
  services), `salonId` `Restrict`. Deletion: soft (`isActive = false`) — services with reservation history
  are never hard-deleted (`Reservation.serviceId` is `Restrict`). Privacy: public once active.

## EmployeeProfile / EmployeePortfolioItem / EmployeeService

No login in MVP (only `SalonMembership` roles authenticate) — a profile record managed by `SALON_ADMIN`.
Tenant ownership: `salonId`. `EmployeeService` is the join table proving service eligibility (required
before an employee can be booked for that service — [reservation flow §4](../Salonomia_Optimal_Customer_Reservation_Flow.md)).
Uniqueness: `EmployeeService(employeeId, serviceId)`. FK: `salonId` `Restrict`; portfolio/eligibility rows
`Cascade` with their employee (they carry no independent business meaning). Deletion: soft
(`isActive = false`); reservation history keeps `Reservation.employeeId` `Restrict`. Privacy: public
profile/portfolio once active.

## WorkingSchedule / Break / TimeOff

Availability inputs (never trusted from the client — recomputed server-side every booking). Tenant
ownership: via `employeeId` → `salonId`. `WorkingSchedule`/`Break`: recurring, `weekday` (0–6) +
start/end minute-of-day in the salon's local time. `TimeOff`: absolute `startAt`/`endAt` (UTC). Index:
`(employeeId, weekday)` / `(employeeId, startAt)`. FK: `Cascade` with employee (purely operational
config, no independent record-keeping value). Privacy: tenant-internal.

## Reservation

The core transactional entity. Tenant ownership: `salonId`. Fields: `serviceId`, `employeeId`,
`customerId` (a `User`), `status` (typed enum — see [ADR-0005](../adr/0005-reservation-concurrency.md)),
`startAt`/`endAt` (UTC), `priceAmount`/`currency` (snapshotted at booking time — server-derived, never
client-supplied), `customerNote`. Uniqueness/concurrency: no unique index; double-booking is prevented by
a `EXCLUDE USING gist` constraint on `(employeeId, tstzrange(startAt, endAt))` for active statuses,
applied in a follow-up raw-SQL migration (Prisma cannot express `EXCLUDE` natively). Indexes:
`(salonId, startAt)`, `(employeeId, startAt)`, `(customerId, startAt)`. FK: `salonId`/`serviceId`/
`employeeId`/`customerId` all `Restrict` — a reservation is a financial/audit record and is never
orphaned by deleting the thing it references; the referenced thing must be soft-deleted instead.
Deletion: never hard-deleted. Audit relevance: every status transition. Privacy: sensitive
(customer identity + booking details) — never in public availability responses.

## ReservationStatusHistory

Append-only. Fields: `reservationId`, `fromStatus` (nullable), `toStatus`, `changedByUserId` (nullable —
system-driven transitions have no actor), `reason`. No update/delete path is exposed at the API layer
(immutability is an application-layer contract here, same as `AuditLog`). FK: `reservationId` `Cascade`
(history has no meaning without its reservation); `changedByUserId` `SetNull` (history must survive user
deletion). Privacy: tenant-internal.

## AuditLog

Append-only, platform-wide. Fields: `actorUserId`, `action`, `targetType`, `targetId`, `salonId`
(nullable — platform-level events have none), `metadata` (small `Json`, safe fields only — never
secrets/tokens, see [security-requirements.md](../security/security-requirements.md)). Deliberately
**no foreign-key constraints** on `actorUserId`/`salonId`: an audit row must outlive the user or salon it
references (retention/compliance requirement), so these are plain indexed columns, not FKs. Indexes:
`(salonId, createdAt)`, `(actorUserId, createdAt)`. Privacy: access restricted to SUPERADMIN (MVP).

## Notification

Fields: `userId`, `type`, `payload` (small `Json` — event-specific, not core business data), `readAt`.
FK: `userId` `Cascade` (notifications have no meaning without their recipient). Index:
`(userId, readAt)`. Privacy: tenant-internal / personal to the recipient.
