# ADR-0003: Session-based authentication

## Status

Accepted

## Decision

Use secure, server-side session-based authentication (signed, httpOnly, secure cookies) issued by
`apps/api`, rather than client-managed JWTs stored in browser storage.

Concrete stack (finalized at Phase 4):

- **Credential verification:** `@nestjs/passport` + `passport-local` (email/password strategy).
- **Password hashing:** `argon2` (argon2id) — current OWASP-recommended default, memory-hard.
- **Session transport:** `express-session` with signed, httpOnly, `SameSite=Lax` cookies.
- **Session store:** `connect-pg-simple`, persisting sessions in the same Postgres database (no Redis —
  matches CLAUDE.md's "Redis only when a measured requirement exists").
- **CSRF:** custom double-submit-cookie check (non-httpOnly `csrfToken` cookie + required
  `x-csrf-token` header on state-changing requests) — no external CSRF package pulled in for a pattern
  this small to implement correctly and audit.
- **Rate limiting:** `@nestjs/throttler`, stricter limits on login/register/forgot-password/reset-password.

## Rationale

Sessions can be revoked server-side immediately (required for suspend/removed-membership scenarios);
JWTs in local/session storage are vulnerable to XSS exfiltration and are hard to revoke before expiry.
Cookie-based sessions also simplify CSRF mitigation (double-submit / SameSite) versus bearer tokens.
Passport is the de facto standard for NestJS credential strategies (first-class `@nestjs/passport`
support); `connect-pg-simple` avoids introducing Redis purely for session storage at MVP scale;
`argon2` is preferred over `bcrypt` for new systems (memory-hardness resists GPU cracking better).

## Alternatives considered

- Lucia: was considered, but the project was sunset by its maintainer in favor of a "roll your own"
  guide — not a fit for "avoid custom cryptography, use a vetted approach."
- Auth.js (NextAuth): designed around Next.js being the auth boundary itself; awkward fit where
  `apps/api` (NestJS) must be the single session authority for two separate Next.js frontends.
- JWT access/refresh tokens: rejected per the original decision above (harder revocation, XSS exposure).

## Consequences

`apps/api` is the single session authority; `apps/web` and `apps/dashboard` forward the session cookie
on same-site requests to the API. CSRF protection required for state-changing requests (see
`docs/security/security-requirements.md` and `docs/security/authentication.md`).
