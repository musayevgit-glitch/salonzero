# ADR-0003: Session-based authentication

## Status
Accepted

## Decision
Use secure, server-side session-based authentication (signed, httpOnly, secure cookies) issued by
`apps/api`, rather than client-managed JWTs stored in browser storage. Exact library selection (e.g.
Lucia, or NestJS session + Passport) is deferred to Phase 4 implementation and recorded there if it
narrows further.

## Rationale
Sessions can be revoked server-side immediately (required for suspend/removed-membership scenarios);
JWTs in local/session storage are vulnerable to XSS exfiltration and are hard to revoke before expiry.
Cookie-based sessions also simplify CSRF mitigation (double-submit / SameSite) versus bearer tokens.

## Consequences
`apps/api` is the single session authority; `apps/web` and `apps/dashboard` forward the session cookie
on same-site requests to the API. CSRF protection required for state-changing requests (see
`docs/security/security-requirements.md`).
