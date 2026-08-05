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
