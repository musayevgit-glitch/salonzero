# Data Classification

- **Secret** (never logged, never returned to client): password hashes, session secrets, reset/invite
  tokens, API keys, storage signing keys.
- **Sensitive PII**: customer phone/email/name, employee contact info, salon internal notes, financial/
  payroll data. Access requires the specific role permission in
  [role-permission-matrix.md](../product/role-permission-matrix.md); never included in public API
  responses or public caches.
- **Tenant-internal**: reservation details, schedules, service prices — visible only within the owning
  salon's authorized roles and the owning customer.
- **Public**: salon public profile, active services/prices, active stylist public profile, aggregate
  ratings, publicly computed availability slots (no customer identity attached).
