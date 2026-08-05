# Key User Flows

Full step-by-step UX/validation/security detail lives in
`docs/Salonomia_Optimal_Customer_Reservation_Flow.md` (authoritative for the customer booking journey).
This document gives only the four most important flows as diagrams.

## 1. Customer booking flow

```mermaid
flowchart LR
  A[Salon discovery] --> B[Salon profile]
  B --> C[Service selection]
  C --> D[Stylist: specific or any]
  D --> E[Date and time]
  E --> F[Booking summary]
  F --> G[Login or registration]
  G --> H[Final confirmation]
  H --> I[Booking result]
```

## 2. Server-side reservation creation (concurrency-safe)

```mermaid
flowchart TD
  A[Receive booking request] --> B[Get customer identity from session]
  B --> C[Validate salon/service/stylist relationships]
  C --> D[Reload price + duration from DB]
  D --> E[Begin transaction]
  E --> F[Re-check availability for conflicts]
  F -->|Conflict| G[Rollback, return safe conflict response]
  F -->|Free| H[Create reservation + status history + audit + notification]
  H --> I[Commit transaction]
```

## 3. Reservation status lifecycle

```mermaid
stateDiagram-v2
  [*] --> PENDING
  [*] --> CONFIRMED: auto-confirm policy
  PENDING --> CONFIRMED: salon confirms
  PENDING --> REJECTED: salon rejects
  CONFIRMED --> CANCELLED_BY_CUSTOMER
  CONFIRMED --> CANCELLED_BY_SALON
  CONFIRMED --> CHECKED_IN
  CHECKED_IN --> COMPLETED
  CONFIRMED --> NO_SHOW
  PENDING --> CANCELLED_BY_CUSTOMER
```

## 4. SUPERADMIN audited salon-context entry

```mermaid
flowchart LR
  A[SUPERADMIN requests salon context] --> B[Explicit context-entry action]
  B --> C[Audit event recorded]
  C --> D[Scoped access to that salon only]
  D --> E[All actions logged under context]
```
