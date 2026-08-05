# Observability

- Structured JSON logs (request id, route, salonId when resolved, userId, latency, status) — never
  passwords, tokens, session secrets, or full customer PII.
- Error tracking captures exceptions with the same correlation id used in the error response.
- Audit log (`AuditModule`) is a separate, immutable, business-facing trail — distinct from operational
  logs; queried only by SUPERADMIN (MVP).
- Core Web Vitals measured in production for public `apps/web` routes.
- Health/readiness endpoints on `apps/api` for deployment checks (added in Phase 2 foundation).
