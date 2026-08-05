# Security Requirements (architecture-level)

Non-negotiable rules already listed in `CLAUDE.md` / playbook §2 are not repeated here. Architecture-
specific requirements:

- CSRF: SameSite=Lax/Strict cookies + double-submit or origin-check on state-changing API routes, since
  auth is cookie/session-based (ADR-0003).
- CORS: explicit allowlist of `apps/web` and `apps/dashboard` origins only; no wildcard with credentials.
- Security headers: HSTS, X-Content-Type-Options, X-Frame-Options/frame-ancestors, a Content-Security-Policy
  restrictive enough to block inline script injection.
- Rate limiting: login, registration, password reset, reservation creation, public search — per-IP and
  per-account.
- Uploads: signed S3-compatible URLs issued by `apps/api` only after ownership check; validate MIME/size/
  extension server-side; store with random generated names, never the client-supplied filename.
- Public caching: only fully public salon/service/availability data may be cached at the edge; any
  response containing session-derived or customer-specific data is `Cache-Control: private, no-store`.
- Subdomain handling: salon subdomain → salon resolution happens server-side against the `Salon` table;
  never trust a client-supplied `salonId` alongside a subdomain-derived one — they must match.
