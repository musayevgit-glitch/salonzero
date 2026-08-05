# Container Diagram

```mermaid
flowchart TB
  subgraph Browser
    C1[Customer]
    C2[Salon staff / Superadmin]
  end
  subgraph Monorepo
    Web[apps/web - Next.js]
    Dash[apps/dashboard - Next.js]
    API[apps/api - NestJS]
    UI[packages/ui]
    Val[packages/validation - Zod]
    Auth[packages/auth]
    DB[packages/database - Prisma]
  end
  Postgres[(PostgreSQL)]

  C1 --> Web
  C2 --> Dash
  Web --> API
  Dash --> API
  Web --> UI
  Dash --> UI
  API --> Val
  API --> Auth
  API --> DB
  DB --> Postgres
```

Both frontend apps import `packages/ui` and `packages/validation` (shared Zod schemas with the API, so
client-side validation and server-side validation never drift). Only `apps/api` (via `packages/database`)
holds a Postgres connection.
