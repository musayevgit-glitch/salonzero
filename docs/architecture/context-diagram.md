# Context Diagram

```mermaid
flowchart LR
  Customer((Customer browser)) --> Web[apps/web]
  StaffUser((Salon staff / Superadmin browser)) --> Dash[apps/dashboard]
  Web --> API[apps/api NestJS]
  Dash --> API
  API --> DB[(PostgreSQL)]
  API --> Storage[(S3-compatible storage)]
  API --> Mail[Email/notification provider]
```

Public internet reaches only `apps/web`, `apps/dashboard`, and `apps/api`. Postgres and storage are never
directly reachable from the browser; uploads use signed URLs issued by the API.
