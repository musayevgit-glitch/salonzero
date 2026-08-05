# Threat Model

Format: threat → mitigation → required test.

| Threat | Mitigation | Required test |
|---|---|---|
| Cross-tenant data access (tenant escape) | `salonId` in every query `WHERE`, derived from session/membership | right role, wrong salon → denied |
| IDOR/BOLA via guessed/modified resource ID | ownership + tenant check in the query itself, not post-fetch | modified ID on owned vs. foreign resource |
| Privilege escalation (role/membership tampering) | role + membership re-resolved server-side every request, never trusted from client/session payload the client can edit | forged role/salonId in request body ignored |
| Mass assignment | DTO allowlists via Zod/class-validator; reject unknown fields on sensitive writes | forbidden-field injection test |
| Session theft / fixation | httpOnly secure cookies, session rotation on login/privilege change | session fixation regression test |
| CSRF | SameSite + origin check on state-changing routes | CSRF token/origin mismatch rejected |
| XSS | React auto-escaping, CSP, no `dangerouslySetInnerHTML` with user input | stored-XSS payload rendered safely |
| Injection | Prisma parameterized queries only, no raw SQL string interpolation | n/a (static rule; code review gate) |
| Reservation race condition / double booking | DB exclusion constraint + in-transaction re-check (ADR-0005) | parallel competing booking requests, only one succeeds |
| Audit log tampering | append-only writes, no update/delete API exposed | attempt to mutate audit row via API → rejected |
| Public-cache leakage of private data | `Cache-Control: private` on any session/customer-scoped response | private route response not cacheable |
| Insecure subdomain/domain handling | server-side subdomain→salon resolution must match session-authorized salon | mismatched subdomain vs. authorized salon → denied |
| Export/report leakage across tenants | reports scoped identically to other tenant-owned queries; capped page/export size | cross-tenant report request → denied |
| Reset-token / invitation replay | single-use tokens, expiry, invalidated after use | reused token → rejected |

## Critical gaps at this stage
None — this is the initial architecture-phase model; no code exists yet to have introduced gaps.
Re-run this review at Phase 12 (Complete Security Audit) against actual implementation.
