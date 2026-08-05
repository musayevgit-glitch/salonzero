# Authentication (Phase 4)

Stack decision: [ADR-0003](../adr/0003-authentication.md). This doc specifies behavior per flow; it does
not repeat the non-negotiable rules in `CLAUDE.md`.

## Registration (CUSTOMER self-service)

`POST /auth/register` — email, password, fullName. Password hashed with argon2id before storage.
Duplicate email returns a generic 409 (email format is already public knowledge once typed, so this one
case does not need enumeration resistance — see Login/Forgot-password below for where it matters more).
On success: session created immediately (no email verification gate in MVP — see
`docs/product/open-decisions.md` if this needs revisiting), `AuditLog` event `user.registered`.

## Login

`POST /auth/login` — email, password. Passport `local` strategy verifies via argon2; on any failure
(unknown email, wrong password, suspended account) returns the same generic
`"Invalid email or password"` message and the same response shape/timing class — no field-level
distinction, so an attacker cannot enumerate valid emails. Session created on success (regenerated
session ID, not reused, to prevent fixation). `AuditLog` event `user.login_succeeded` /
`user.login_failed` (failure events store no password data).

## Logout

`POST /auth/logout` — destroys the server-side session (removes the row from the `connect-pg-simple`
session store) and clears the cookie. `AuditLog` event `user.logout`.

## Session model

- Cookie: httpOnly, `SameSite=Lax`, `Secure` in production, signed with `SESSION_SECRET`.
- Store: Postgres (`connect-pg-simple`) — revoking a session means deleting its store row; a suspended
  user's active sessions are not auto-revoked in MVP (documented gap — see Risks in
  `docs/implementation/progress.md` once implemented) but every subsequent request re-checks
  `User.status` server-side, so a suspended account cannot perform any action even with a live cookie.
- Rotation: session ID regenerated on login and on privilege-relevant change (password reset).

## Forgot password / reset password

`POST /auth/forgot-password` — always returns the same generic success message regardless of whether the
email exists (enumeration resistance is the whole point of this endpoint). If the user exists and is
active, a single-use `PasswordResetToken` is created: cryptographically random token (via Node's
`crypto.randomBytes`, not a custom algorithm), only its hash stored, `expiresAt` short-lived (1 hour).
`POST /auth/reset-password` — token + new password. Token must be unexpired, unused, and match by hash;
consumed (`usedAt` set) on success so it cannot be replayed. Password updated, all existing sessions for
that user are invalidated (store rows deleted), `AuditLog` event `user.password_reset`.

## Invitation acceptance (SALON_ADMIN / SALON_MANAGER)

A `SalonInvitation` row (single-use token, hashed like the reset token, expiring) is created by an
inviter (Phase 6/7 UI calls an authorization-gated endpoint, not built in this phase). `POST
/auth/invitations/:token/accept` — token must be unexpired/unused; creates the `User` if the email has no
account yet (no password set through this path — the acceptance flow requires setting one), or attaches
the `SalonMembership` to an existing account. Token consumed on use. `AuditLog` event
`membership.invitation_accepted`.

## Suspended users

Any authenticated request re-checks `User.status === 'ACTIVE'` (not just at login) — a session created
before suspension stops working on the very next request, not just the next login.

## CSRF

Double-submit cookie: a non-httpOnly `csrfToken` cookie is set alongside the session; every
state-changing request (`POST`/`PATCH`/`PUT`/`DELETE`) must echo it in an `x-csrf-token` header. Bodies
never carry the token (keeps it out of logs/referrers).

## Rate limits (`@nestjs/throttler`)

Stricter than the global default on: `/auth/login`, `/auth/register`, `/auth/forgot-password`,
`/auth/reset-password` — per-IP, short window, to slow credential-stuffing and reset-token brute forcing.

## Safe redirects

Any "return to" destination carried through login (e.g. resuming a booking draft) must be an internal
path only — validated against an allowlist pattern (starts with `/`, no protocol-relative `//` prefix),
never an arbitrary external URL.

## What this phase does NOT do

Full RBAC/tenant authorization is Phase 10 (`docs/security/authorization.md`, not yet written). This
phase only establishes "who is the authenticated user" (`GET /auth/me`) — it does not gate any
salon-scoped or role-scoped action.
