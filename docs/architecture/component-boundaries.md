# Component Boundaries (apps/api)

NestJS modules, one per bounded context:

- **AuthModule** — registration, login, logout, session/token issuance, password reset, invitations.
- **AuthzModule** (`packages/auth`) — role + tenant-membership policy functions, guards, decorators.
  Every other module depends on this; it depends on nothing domain-specific.
- **SalonsModule** — salon CRUD, domain/subdomain, suspend/restore (SUPERADMIN + scoped SALON_ADMIN reads).
- **EmployeesModule**, **ServicesModule**, **SchedulingModule** (schedules/breaks/time-off) — SALON_ADMIN
  owned, all queries scoped by salon membership.
- **ReservationsModule** — availability engine + booking state machine; the only module allowed to write
  reservation rows; owns the concurrency-safe transaction (see [ADR-0005](../adr/0005-reservation-concurrency.md)).
- **CustomersModule** — customer profile, own-reservation views.
- **ReportsModule** — read-only, tenant- or platform-scoped aggregation queries.
- **AuditModule** — append-only writer, called by other modules; never exposes an update/delete API.

Rule: a module may only read/write rows it owns. Cross-module reads go through the owning module's service,
not through direct Prisma calls into another module's tables, so authorization stays centralized.

## Guard order (every protected route)
authentication → active account → role → active salon membership → tenant scope → resource ownership →
action permission → input validation → forbidden-field rejection → (audit write on success).
