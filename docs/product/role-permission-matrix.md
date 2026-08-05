# Role Permission Matrix (MVP)

Scope column = the tenant boundary the action is evaluated against.

| Action / Resource                                          | SUPERADMIN                           | SALON_ADMIN (own salon)                   | SALON_MANAGER (own salon)      | CUSTOMER (own data)                     |
| ---------------------------------------------------------- | ------------------------------------ | ----------------------------------------- | ------------------------------ | --------------------------------------- |
| Create/delete salon                                        | ✅                                   | ❌                                        | ❌                             | ❌                                      |
| Suspend/restore salon                                      | ✅                                   | ❌                                        | ❌                             | ❌                                      |
| Manage domain/subdomain                                    | ✅                                   | ❌                                        | ❌                             | ❌                                      |
| Edit salon profile/policy                                  | ✅ (any)                             | ✅                                        | ❌                             | ❌                                      |
| Manage employees/portfolios                                | ✅ (any)                             | ✅                                        | ❌                             | ❌                                      |
| Manage services/categories                                 | ✅ (any)                             | ✅                                        | ❌                             | ❌                                      |
| Manage schedules/breaks/time-off                           | ✅ (any)                             | ✅                                        | ❌                             | ❌                                      |
| Invite/remove SALON_MANAGER                                | ✅ (any)                             | ✅ (if policy allows)                     | ❌                             | ❌                                      |
| View/search reservations                                   | ✅ (any)                             | ✅                                        | ✅                             | own only                                |
| Create manual reservation                                  | ✅ (any)                             | ✅                                        | ✅                             | ❌                                      |
| Confirm/reject/reschedule/cancel/check-in/complete/no-show | ✅ (any)                             | ✅                                        | ✅                             | own, per policy: cancel/reschedule only |
| Create own reservation                                     | —                                    | —                                         | —                              | ✅                                      |
| View salon financial/payroll reports                       | ✅ (any)                             | ✅                                        | ❌                             | ❌                                      |
| View platform reports/audit log                            | ✅                                   | ❌                                        | ❌                             | ❌                                      |
| Manage own profile                                         | ✅                                   | ✅                                        | ✅                             | ✅                                      |
| Assign SUPERADMIN                                          | ✅                                   | ❌                                        | ❌                             | ❌                                      |
| Access another salon's data                                | ✅ (explicit, audited context entry) | ❌                                        | ❌                             | ❌                                      |
| Access another customer's data                             | ❌                                   | ❌ (except required contact info for ops) | ❌ (contact info for ops only) | ❌                                      |

Rules:

- Deny by default; absence from this table means denied.
- SUPERADMIN cross-salon access must go through an explicit, audited context-entry action — never implicit.
- SALON_ADMIN/SALON_MANAGER scope is enforced server-side by salon membership, never by client-supplied salon ID.
- CUSTOMER scope is enforced by authenticated session identity, never by client-supplied customer ID.
