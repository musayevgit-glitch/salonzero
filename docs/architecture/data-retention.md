# Data Retention

See [ADR-0006](../adr/0006-deletion-and-retention.md) for the decision and rationale; this doc is the
quick-reference policy per entity.

| Entity                                                                      | Deletion policy                                                                                                                                                                              |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Salon                                                                       | Soft delete only (`status = SUSPENDED`, `deletedAt` set) via SUPERADMIN suspend/restore. No hard delete in MVP code — a future retention job is a documented follow-up, not implemented now. |
| User                                                                        | Soft delete (`status = SUSPENDED`). Hard delete blocked while any `Reservation`/`SalonMembership` references the user.                                                                       |
| Service / EmployeeProfile                                                   | Soft delete (`isActive = false`). Hard delete blocked while any `Reservation` references them.                                                                                               |
| Reservation                                                                 | Never deleted — financial/audit record. Cancellation is a status transition, not a row deletion.                                                                                             |
| ReservationStatusHistory / AuditLog                                         | Append-only, never deleted or edited by application code.                                                                                                                                    |
| WorkingSchedule / Break / TimeOff / EmployeePortfolioItem / EmployeeService | Cascade-deleted with their employee — pure operational config, no independent retention need.                                                                                                |
| Notification                                                                | Cascade-deleted with its user.                                                                                                                                                               |

No entity in this MVP schema is ever hard-deleted by application code except the operational-config rows
listed above (which cascade with their non-hard-deletable parent's _soft_ deactivation being the normal
path — cascade only fires if an employee row is ever truly removed, which the API does not expose).

## Migration rollback notes

Prisma does not generate down-migrations; CLAUDE.md requires a rollback plan per migration. **Do not
edit an already-applied migration's `.sql` file to add this** — Prisma checksums applied migrations and
will refuse to run (or prompt for a destructive `migrate reset`) if the content changes afterward.
Record rollback plans here instead:

- `20260805204117_init` — pre-production only. Rollback: `DROP SCHEMA public CASCADE; CREATE SCHEMA
public;` then `prisma migrate resolve --rolled-back 20260805204117_init`. Never use once real data
  exists — write a proper reverse migration instead.
- `20260805204128_reservation_overlap_exclusion` — `ALTER TABLE "Reservation" DROP CONSTRAINT
"reservation_no_overlap_per_employee", DROP CONSTRAINT "reservation_start_before_end";` then
  `prisma migrate resolve --rolled-back 20260805204128_reservation_overlap_exclusion`. `btree_gist` is
  left installed (harmless) rather than dropped.
- `20260805205231_auth_tokens` — pre-production only, no real tokens issued yet. Rollback: `DROP TABLE
"PasswordResetToken", "SalonInvitation";` then `prisma migrate resolve --rolled-back
20260805205231_auth_tokens`.
