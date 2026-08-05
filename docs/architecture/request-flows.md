# Request Flows

## Tenant-scoped write (e.g. SALON_ADMIN edits a service)

```mermaid
sequenceDiagram
  participant Browser
  participant API as apps/api
  participant Guard as Authz Guard
  participant DB as Postgres

  Browser->>API: PATCH /services/:id (session cookie)
  API->>Guard: authenticate + resolve role + salon membership
  Guard-->>API: authorized salonId (server-derived, not from request)
  API->>DB: UPDATE services SET ... WHERE id = :id AND salonId = :authorizedSalonId
  DB-->>API: 0 or 1 row updated
  API-->>Browser: 200 or 404 (never reveals existence of other tenant's row)
```

Key rule: the `WHERE salonId = :authorizedSalonId` clause is part of the query itself, never a
check performed after an unscoped `findById`.

## Reservation creation

See [reservation-concurrency ADR](../adr/0005-reservation-concurrency.md) and the authoritative
`docs/Salonomia_Optimal_Customer_Reservation_Flow.md` §9 for the full server-side sequence.
