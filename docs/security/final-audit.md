# Salonomia — Phase 12 Final Adversarial Security Audit

**Date:** 2026-08-07
**Scope:** `apps/api`, `apps/web`, `apps/dashboard`, `packages/validation`, `packages/storage`, `packages/database`
**Method:** Read-only source review. Attacker model assumes full control of URLs, path/query params, JSON
bodies, headers, cookies the attacker can set on their own client, request timing, and request concurrency;
and assumes the attacker may hold a valid account in _any_ role (CUSTOMER, SALON_MANAGER, SALON_ADMIN).
UI-side restrictions are treated as non-controls.
**Status:** Documentation only — no code was changed.

---

## 0. Summary of posture

Tenant isolation in the salon-scoped modules is genuinely strong and is the best part of this codebase.
`RolesGuard` fails closed when `@Roles()` is absent, resolves the caller's role from a database membership
row rather than from anything the client sent, and every salon-scoped service takes the _authorized_
`SalonContext.salonId` and puts it inside the `where` clause of the read **and** the write
(`employees.service.ts`, `services.service.ts`, `portfolio.service.ts`, `staff-reservations.service.ts`,
`transitions.service.ts`). Double-booking is backed by a real Postgres `EXCLUDE USING gist` constraint, not
just by an application check. All request schemas reviewed use `.strict()`, so classic mass assignment is
structurally blocked. Passwords use argon2id; reset/invitation tokens are stored only as SHA-256 hashes.
Passport 0.7 regenerates the session on login and logout, so classic session fixation is _not_ present.

The findings below are therefore concentrated in the seams: **account lifecycle** (invitation acceptance and
password reset), **the manager-facing manual booking path** (which reaches a global `User` record by
attacker-chosen email), **transport/infrastructure hardening** (no proxy trust, no security headers, no
cache directives), and **rate limiting**.

---

## SEC-001 — Invitation acceptance grants a full session on an existing account without proving ownership

- **Severity:** HIGH
- **Confidence:** CONFIRMED
- **Category:** Broken authentication / account takeover / tenant takeover
- **Affected files:**
  - `apps/api/src/auth/auth.service.ts:154-195` (`acceptInvitation`)
  - `apps/api/src/auth/auth.controller.ts:121-134` (`POST /auth/invitations/accept` then `req.login(user)`)
  - `apps/api/src/auth/auth.service.ts:36-58` (`register` — no email verification)
  - `apps/api/src/salons/salons.service.ts:135-158` (invitation minted with a caller-chosen `adminEmail`)

### Evidence

```ts
// apps/api/src/auth/auth.service.ts:162-176
const existingUser = await this.prisma.user.findUnique({ where: { email: invitation.email } });

const user = await this.prisma.$transaction(async (tx) => {
  const resolvedUser =
    existingUser ??
    (await tx.user.create({
      data: {
        email: invitation.email,
        fullName: input.fullName ?? invitation.email,
        passwordHash: await this.password.hash(input.password ?? this.tokens.generate().token),
      },
    }));

  await tx.salonMembership.create({
    data: { userId: resolvedUser.id, salonId: invitation.salonId, role: invitation.role },
  });
```

```ts
// apps/api/src/auth/auth.controller.ts:125-133
const user = await this.authService.acceptInvitation(body);
if (!user) { throw new UnauthorizedException(...); }
await new Promise<void>((resolve, reject) => {
  req.login(user, (err) => (err ? reject(err) : resolve()));
});
```

When the invited email already has an account, the code takes the `existingUser` branch, **never verifies a
password, never verifies email ownership, never checks `user.status`**, and then the controller establishes
an authenticated session as that user. Possession of the invitation token is, by itself, sufficient to
become the account.

### Attack scenario A — pre-registration squatting leading to tenant takeover

1. Attacker learns (from the salon's public website, LinkedIn, a press release, or simply by guessing the
   pattern `owner@<salon-domain>`) the email the platform operator will invite as the new salon's first
   `SALON_ADMIN`.
2. Attacker calls `POST /auth/register` with that email. Registration performs **no email verification**
   (`auth.service.ts:36-58`), so the attacker now controls a `User` row keyed on the victim's address, with
   a password only the attacker knows.
3. A SUPERADMIN creates the salon via `POST /salons` with `adminEmail = owner@salon.example`. A
   `SalonInvitation` is created and the raw token is handed to the operator to relay
   (`salons.service.ts:135-158`, `CreateSalonResult.invitation.token`).
4. The real owner receives the link and submits it to `POST /auth/invitations/accept`.
5. `existingUser` resolves to **the attacker's** account. `SALON_ADMIN` membership for the brand-new salon
   is attached to the attacker's user id, and the real owner is logged into the attacker's account.
6. The attacker logs in with their own password and is now `SALON_ADMIN` of a tenant they were never
   invited to: full access to employees, services, all reservations, all customer PII, and reports for that
   salon.

### Attack scenario B — invitation token equals account takeover

Anyone who obtains an invitation token out-of-band (relayed over chat, forwarded email, shoulder-surfed,
copied from a shared operator ticket, or leaked because the operator must relay it manually since no mailer
exists) can `POST /auth/invitations/accept` and receive an authenticated session as the _existing_ account
that owns that email — including an account that is `SUSPENDED`, and including an account that holds
`isSuperadmin` or memberships in other tenants. The session then carries every one of that user's existing
privileges, not just the invited role.

### Remediation

1. If `existingUser` is found, do **not** call `req.login`. Require the invitee to authenticate first, then
   bind the membership to the already-authenticated session (`req.user.email === invitation.email`), or
   require a password-reset round-trip that proves control of the mailbox.
2. Reject acceptance when `existingUser.status !== 'ACTIVE'` or when the invitation's salon is not `ACTIVE`.
3. Verify email ownership at registration (or, minimally, refuse to bind an invitation to an account whose
   email was never verified) so a squatted account can never absorb an invitation.
4. Use `salonMembership.upsert` (or catch `P2002`) so a repeat acceptance is a 409, not a 500.

### Required regression tests

- `accept-invitation-existing-account.e2e.test.ts`: an invitation for `victim@x.test`, where that account
  already exists, **must not** return a `connect.sid` session for `victim@x.test` without authentication.
- Pre-registration squatting: register `owner@salon.test`, create a salon inviting the same address, accept
  the invitation, assert the membership is **not** silently attached to the pre-registered account, or that
  acceptance is rejected pending verification.
- Acceptance by a `SUSPENDED` user is rejected with the same generic error as an invalid token.
- Double acceptance of the same token returns 401 (already accepted), never 500.

---

## SEC-002 — Manual booking is a cross-tenant account-existence and real-name oracle

- **Severity:** HIGH
- **Confidence:** CONFIRMED
- **Category:** Cross-tenant information disclosure / IDOR-by-email
- **Affected files:**
  - `apps/api/src/reservations/reservations.service.ts:263-276` (`createManual` customer resolution)
  - `apps/api/src/reservations/staff-reservations.service.ts:9-21` (`STAFF_RESERVATION_SELECT` returns
    `customer: { id, fullName, email }`)
  - `apps/api/src/reservations/staff-reservations.controller.ts:36-43`
    (`GET /salons/:salonId/reservations/:reservationId`)
  - `packages/validation/src/reservations.ts:31-41` (`createManualReservationSchema`)

### Evidence

```ts
// apps/api/src/reservations/reservations.service.ts:263-276
// customerFullName is required by the schema unconditionally (even for an existing customer)
// so this lookup never has to branch its error on whether the account exists — that branch
// was a cross-tenant account-existence oracle. An existing customer's name is left untouched.
let customer = await this.prisma.user.findUnique({ where: { email: input.customerEmail } });
if (!customer) {
  customer = await this.prisma.user.create({
    data: {
      email: input.customerEmail,
      passwordHash: `unset:${crypto.randomUUID()}`,
      fullName: input.customerFullName,
    },
  });
}
```

```ts
// apps/api/src/reservations/staff-reservations.service.ts:20
customer: { select: { id: true, fullName: true, email: true } },
```

The comment claims the oracle was closed by making `customerFullName` unconditionally required. It closed
the _error-shape_ oracle but not the _response-content_ oracle: `User` is a **global**, non-tenant-scoped
table, and the reservation read-back returns the resolved user's **stored** `fullName` and **global** `id`.

### Attack scenario

1. Attacker holds `SALON_MANAGER` (the lowest staff role) on their own legitimate salon `S`.
2. `POST /salons/S/reservations/manual` with `customerEmail = target@example.com`,
   `customerFullName = "zzzz"`, plus any valid `serviceId`/`startAt` for `S`.
3. The response returns the created reservation id. `GET /salons/S/reservations/{id}` returns
   `customer.fullName` and `customer.id`.
4. If `customer.fullName === "zzzz"`, no account existed. If it is anything else, an account exists **and
   the attacker has just read that person's real name and their stable platform-wide user id**.
5. Iterate over a wordlist of emails (subject only to the global 120 req/min throttle) to enumerate the
   entire platform user base — including customers of competing salons, other salons' admins, and
   superadmins — and harvest email / real-name / global-user-id triples.
6. Side effect: every probe **creates a real reservation on the victim's account**. The victim sees it at
   `GET /customer/reservations`. This is a spam/harassment and social-engineering primitive ("your booking
   at <salon> is pending — click here"), and it pollutes another tenant's customer with the attacker's data.

Note this is not fixable by hiding the field in the dashboard UI; the API returns it.

### Remediation

1. Do not resolve manual-booking customers against the global `User` table by attacker-supplied email.
   Introduce a per-salon customer record (or a `SalonCustomer` link) and only reuse a global `User` when
   that user already has a relationship with this salon.
2. If global reuse must stay, return the **manager-supplied** `customerFullName` for the reservation
   (snapshot it onto the `Reservation` row) rather than the global profile name, and never expose the
   global `User.id` to staff of a salon the user has no prior relationship with.
3. Rate-limit `POST /salons/:salonId/reservations/manual` per actor (not just per IP) and audit it as a
   PII-touching action.
4. Require the customer's confirmation (or at minimum notify them) before a staff-created reservation is
   attached to a pre-existing account.

### Required regression tests

- Manual booking with an email that already belongs to another salon's customer must not return that
  user's real `fullName` or global `id` in the staff detail response.
- Manual booking with a fresh email vs. an existing email must produce **byte-identical** response shapes
  for every field a manager can observe.
- A manager must not be able to create more than N manual bookings per minute (per-actor throttle test).

---

## SEC-003 — Open redirect: `isSafeRedirectPath` accepts backslash-prefixed protocol-relative URLs

- **Severity:** MEDIUM
- **Confidence:** CONFIRMED
- **Category:** Open redirect leading to credential phishing
- **Affected files:**
  - `packages/validation/src/auth.ts:51-54`
  - `apps/web/app/login/LoginForm.tsx:11-13,24,35`
  - `apps/web/app/register/RegisterForm.tsx:11-13,33`

### Evidence

```ts
// packages/validation/src/auth.ts:51-54
// Safe-redirect allowlist: internal path only, never an absolute/protocol-relative URL.
export function isSafeRedirectPath(path: string): boolean {
  return /^\/(?!\/)/.test(path);
}
```

```ts
// apps/web/app/login/LoginForm.tsx:12-13
const returnTo = searchParams.get('returnTo');
const safeReturnTo = returnTo && isSafeRedirectPath(returnTo) ? returnTo : '/account';
```

The regex only blocks a literal second `/`. It does not block a backslash, which the WHATWG URL parser
normalizes to `/` in the authority position. Verified locally with `new URL(path, 'https://app.example.com')`:

| input         | `isSafeRedirectPath` | resolves to                       |
| ------------- | -------------------- | --------------------------------- |
| `/\evil.com`  | `true`               | `https://evil.com/`               |
| `/\/evil.com` | `true`               | `https://evil.com/`               |
| `/\\evil.com` | `true`               | `https://evil.com/`               |
| `//evil.com`  | `false`              | (correctly blocked)               |
| `/account`    | `true`               | `https://app.example.com/account` |

### Attack scenario

1. Attacker sends `https://salonomia.example/login?returnTo=/\evil.example/login` to a victim (the link's
   visible origin is the real, trusted site).
2. `isSafeRedirectPath` returns `true`, so `safeReturnTo` is used verbatim.
3. On successful login, `router.replace` resolves that value against the current origin, producing
   `https://evil.example/login`, and the Next router performs a cross-origin navigation.
4. The victim, who has just successfully authenticated on the genuine site, lands on an attacker-controlled
   clone that asks them to "re-enter your password" or "confirm your booking payment". The redirect is a
   credential-harvesting amplifier and also leaks the previous page via `Referer`.

The same primitive applies to the `returnTo` on `/register` and to any future server-side use of this helper.

### Remediation

Replace the regex with an explicit parse-and-compare:

```ts
export function isSafeRedirectPath(path: string): boolean {
  if (typeof path !== 'string' || !path.startsWith('/')) return false;
  if (/^\/[\\/]/.test(path)) return false; // blocks //host and /\host
  if ([...path].some((ch) => ch.charCodeAt(0) < 0x20)) return false; // blocks CR/LF/TAB smuggling
  try {
    const url = new URL(path, 'https://placeholder.invalid');
    return url.origin === 'https://placeholder.invalid';
  } catch {
    return false;
  }
}
```

### Required regression tests

- `isSafeRedirectPath` table test asserting `false` for `//evil`, `/\evil`, `/\/evil`, `/\\evil`,
  a tab-containing path, `https://evil`, `javascript:alert(1)`; and `true` for `/account`,
  `/account/reservations?page=2`, `/salons/x/book/confirm`.
- Playwright: `/login?returnTo=/\evil.example` must land on `/account`, never off-origin.

---

## SEC-004 — Password reset does not invalidate existing sessions or sibling reset tokens

- **Severity:** MEDIUM
- **Confidence:** CONFIRMED
- **Category:** Session management / incomplete account recovery
- **Affected files:** `apps/api/src/auth/auth.service.ts:127-152`

### Evidence

```ts
// apps/api/src/auth/auth.service.ts:137-143
await this.prisma.$transaction([
  this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
  this.prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  }),
]);
```

Only the _one consumed_ token is marked used. Sessions live in the `session` table
(`connect-pg-simple`, `configure-app.ts:19-34`) and are keyed only by session id; nothing deletes the
victim's other sessions. `SessionSerializer.deserializeUser` re-reads the user on every request but only
checks `status`, not a password/session epoch (`session.serializer.ts:16-24`).

### Attack scenario

1. Attacker phishes or otherwise steals a victim's session cookie (or simply logs in on a shared/kiosk
   machine and leaves the session alive).
2. Victim notices something is wrong and performs the canonical remediation: forgot password, then
   reset password.
3. The victim's password changes; **the attacker's session cookie remains fully valid for the remainder of
   its 7-day `maxAge`** and continues to authenticate as the victim, including for booking, cancellation,
   and profile edits, and — if the victim is a `SALON_ADMIN`/SUPERADMIN — for every tenant operation.
4. Additionally, every other unused reset token for that user stays live until its 1-hour TTL, so a second
   token the attacker triggered earlier can still be redeemed to set a password of their choosing.

### Remediation

1. Delete all rows in the `session` store whose payload references `userId` on password reset (and on
   account suspension). With `connect-pg-simple` this is
   `DELETE FROM session WHERE sess->'passport'->>'user' = $1`.
2. In the same transaction, mark all of that user's other `PasswordResetToken` rows as used.
3. Add a `sessionEpoch`/`passwordChangedAt` column on `User` and reject sessions issued before it inside
   `deserializeUser`, so the invalidation holds even if the store changes.

### Required regression tests

- Log in as user A (session S1). Perform a full forgot/reset cycle. Assert S1 now receives 401 on
  `GET /auth/me`.
- Issue two reset tokens; consume one; assert the second is rejected.

---

## SEC-005 — No `trust proxy`: rate limiting collapses and `secure` cookies are dropped behind TLS termination

- **Severity:** MEDIUM
- **Confidence:** CONFIRMED (by absence)
- **Category:** Infrastructure hardening / rate-limit bypass / availability
- **Affected files:** `apps/api/src/configure-app.ts:13-41`, `apps/api/src/main.ts:7-12`

### Evidence

`configureApp` never calls `app.set('trust proxy', ...)`. Grep for `trust proxy` across `apps/api/src`
returns nothing. Meanwhile:

```ts
// apps/api/src/configure-app.ts:27-32
cookie: { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: 7 * 24 * 60 * 60 * 1000 },
```

### Attack scenario / impact

1. **Session breakage leading to a likely downgrade.** In production behind any TLS-terminating load
   balancer, `express-session` with `secure: true` checks `req.secure`, which is `false` without
   `trust proxy`. The `Set-Cookie` is suppressed and **nobody can log in**. The realistic reaction under
   incident pressure is to set `secure: false`, which permanently exposes session cookies to any network
   attacker on plaintext hops.
2. **Rate limiting collapses to one global bucket.** `ThrottlerGuard` (`app.module.ts:39`) tracks by
   `req.ip`, which without `trust proxy` is the proxy's address for _every_ request. The auth limiter
   (10/60s) and the global limiter (120/60s) become platform-wide counters, so (a) one attacker's login
   brute-force locks out **all** legitimate users — a trivial application-layer DoS — and (b) conversely,
   there is no per-attacker throttling at all.

### Remediation

Set `app.set('trust proxy', <exact hop count>)` (never `true`) in `configureApp`, driven by a validated env
var, and document the expected proxy topology in `docs/operations/deployment.md`. Add a startup assertion
that `NODE_ENV === 'production'` implies a configured proxy hop count.

### Required regression tests

- Integration test that sends `X-Forwarded-For: 1.2.3.4` and `X-Forwarded-For: 5.6.7.8` and asserts the
  auth throttle counters are independent.
- Integration test with `X-Forwarded-Proto: https` in production mode asserting `Set-Cookie` contains
  `Secure`.

---

## SEC-006 — Auth rate limiting is per-IP only, in-memory, and silently disabled by a malformed env var

- **Severity:** MEDIUM
- **Confidence:** CONFIRMED
- **Category:** Rate limiting / brute force
- **Affected files:**
  - `apps/api/src/auth/auth.controller.ts:34-39`
  - `apps/api/src/app.module.ts:25,39`
  - `apps/api/src/config/env.ts:9-19` (`AUTH_THROTTLE_LIMIT` is **not** in the schema)

### Evidence

```ts
// apps/api/src/auth/auth.controller.ts:37-39
const AUTH_THROTTLE = {
  default: { limit: Number(process.env.AUTH_THROTTLE_LIMIT ?? 10), ttl: 60_000 },
};
```

```ts
// apps/api/src/app.module.ts:25
ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 120 }] }),
```

### Attack scenario

1. **Silent disablement.** `AUTH_THROTTLE_LIMIT` bypasses `validateApiEnv` entirely. Any non-numeric value
   (a typo, a templating artifact, `"1_000"`) yields `NaN`. `@nestjs/throttler` compares
   `totalHits > limit`; `5 > NaN` evaluates to `false`, so **the limit never trips** and
   login/register/forgot-password/reset-password/invitation-accept become completely unthrottled — with no
   error, no log, and no test failure. The repo already overrides this variable in CI
   (`apps/api/package.json` has `"test": "AUTH_THROTTLE_LIMIT=1000 vitest run"`), so a value leaking into a
   production manifest is a realistic misconfiguration.
2. **No per-account throttling.** The limiter is keyed on IP only. A distributed credential-stuffing run
   from 5,000 residential proxies gets 10 attempts _each per minute_ against a single account with zero
   friction, and there is no account lockout, no CAPTCHA, and no enforcement built on the
   `user.login_failed` audit rows (`auth.service.ts:69-85`) — they are written but never read.
3. **In-memory storage.** The default `ThrottlerStorageService` is per-process. With two API replicas the
   effective limit doubles; on deploy/restart all counters reset, so an attacker can pace attempts to
   deploy cadence.

### Remediation

- Move `AUTH_THROTTLE_LIMIT` into `apiEnvSchema` as `z.coerce.number().int().min(1).max(100).default(10)`.
- Add a second throttler keyed on the normalized `email` in the body for `/auth/login`,
  `/auth/forgot-password`, and `/auth/invitations/accept`.
- Add progressive account lockout/backoff driven by consecutive `user.login_failed` events.
- Use a shared (Redis/Postgres) throttler storage.

### Required regression tests

- `validateApiEnv({ ...valid, AUTH_THROTTLE_LIMIT: 'abc' })` throws.
- 11 login attempts for the same email from 11 distinct `X-Forwarded-For` values: the 11th is 429.

---

## SEC-007 — CSRF token is unbound to the session and never rotated

- **Severity:** MEDIUM
- **Confidence:** PLAUSIBLE
- **Category:** CSRF (stateless double-submit weaknesses)
- **Affected files:**
  - `apps/api/src/common/csrf-cookie.middleware.ts:8-20`
  - `apps/api/src/auth/guards/csrf.guard.ts:10-21`
  - `apps/api/src/configure-app.ts:39-40`

### Evidence

```ts
// apps/api/src/common/csrf-cookie.middleware.ts:9-18
if (!req.cookies?.[COOKIE_NAME]) {
  const token = randomBytes(32).toString('base64url');
  res.cookie(COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  req.cookies = { ...req.cookies, [COOKIE_NAME]: token };
}
```

```ts
// apps/api/src/auth/guards/csrf.guard.ts:14-20
const cookieToken = request.cookies?.csrfToken;
const headerToken = request.headers['x-csrf-token'];
if (!cookieToken || !headerToken || cookieToken !== headerToken) {
  throw new ForbiddenException('Invalid or missing CSRF token.');
}
```

The token is a free-floating random value. It is (a) never derived from or bound to the session id,
(b) never rotated on login, privilege change, or logout, and (c) issued without a `__Host-` prefix or a
`Domain` restriction. The guard is a plain string comparison, not `timingSafeEqual`.

### Attack scenario

1. Attacker controls or compromises **any** sibling host under the registrable domain — for example a
   salon's `customDomain`/`subdomain` feature (`packages/database/prisma/schema.prisma:144-145`), a
   marketing/status subdomain, or a stale CNAME.
2. From that host, the attacker sets
   `Set-Cookie: csrfToken=ATTACKER_VALUE; Domain=.salonomia.example; Path=/`. Cookies ignore port and (for a
   parent `Domain`) same-origin boundaries, so this overwrites/shadows the API's `csrfToken` cookie for the
   victim.
3. The attacker now _knows_ the victim's `csrfToken`. They still need to send an `x-csrf-token` header,
   which requires a CORS preflight — so the immediate exploit depends on the origin allowlist
   (`configure-app.ts:16`) not containing an attacker-reachable entry. If the allowlist is ever widened to a
   wildcard subdomain pattern, or if any allowlisted origin has an XSS/HTML-injection sink, the CSRF control
   provides no independent protection at that point.
4. Additionally, because the token survives login, a token the attacker learned while the victim was
   anonymous remains valid for the victim's authenticated session (token fixation). It also survives logout,
   so a shared machine retains a predictable value across users.

### Remediation

- Bind the token to the session: store the token (or an HMAC of the session id) in `req.session` and compare
  the header against that, not against a cookie any sibling origin can write.
- Rotate the token inside the `req.login`/`req.logout` flows.
- Issue the cookie with the `__Host-` prefix (forces `Secure`, `Path=/`, no `Domain`).
- Compare with `crypto.timingSafeEqual` after a length check.
- Add an `Origin`/`Sec-Fetch-Site` check as a second, independent control.

### Required regression tests

- A request whose `csrfToken` cookie was replaced after login (simulating cookie tossing) is rejected.
- The `csrfToken` value returned after `POST /auth/login` differs from the pre-login value.
- `Set-Cookie` for the CSRF token uses the `__Host-` prefix in production mode.

---

## SEC-008 — No security response headers anywhere; uploads served without `nosniff`

- **Severity:** MEDIUM
- **Confidence:** CONFIRMED
- **Category:** Missing hardening headers / stored-content risk
- **Affected files:**
  - `apps/api/src/configure-app.ts:13-41` (no `helmet`, not in `apps/api/package.json` dependencies)
  - `apps/api/src/uploads/uploads.controller.ts:66-72`
  - `apps/web/next.config.ts:3-5`, `apps/dashboard/next.config.ts:3-5` (no `headers()`)

### Evidence

```ts
// apps/api/src/uploads/uploads.controller.ts:66-72
const contentType = (head && detectImageMime(head)) || 'application/octet-stream';

res.setHeader('Content-Type', contentType);
res.setHeader('Cache-Control', 'private, max-age=60');
const stream = adapter.createReadStream(payload.objectKey);
```

```ts
// apps/web/next.config.ts
const nextConfig: NextConfig = { reactStrictMode: true };
```

No `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options` /
`frame-ancestors`, `Referrer-Policy`, or `Permissions-Policy` is emitted by the API or by either Next app.

### Attack scenario

1. **Clickjacking on state-changing flows.** With no `frame-ancestors`/`X-Frame-Options`, an attacker frames
   `https://salonomia.example/account/reservations/<id>` and overlays a decoy to trick a logged-in customer
   into clicking "Cancel booking" (`apps/web/app/account/reservations/[reservationId]/page.tsx`), or frames
   the dashboard's suspend/reject controls for a `SALON_ADMIN`.
2. **Content sniffing on uploaded objects.** The upload path writes bytes with no content validation at
   write time (`uploads.controller.ts:40-47`) and the download path sniffs magic bytes and otherwise emits
   `application/octet-stream` — with **no `X-Content-Type-Options: nosniff`** and no
   `Content-Disposition: attachment`. Combined with SEC-010, a staff-role attacker can place non-image
   content at a signed download URL on the API origin.
3. **No CSP** means any future HTML-injection sink in either Next app escalates directly to full script
   execution and session-cookie-scoped API abuse, with no mitigation layer.
4. **No HSTS** leaves first-request downgrade/stripping available on hostile networks.

### Remediation

- Add `helmet` in `configureApp` with an explicit CSP, HSTS (production only), `nosniff`,
  `frame-ancestors 'none'`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- Add `X-Content-Type-Options: nosniff` and `Content-Disposition: inline; filename="..."` on
  `GET /uploads/:token`, and refuse to serve objects whose sniffed type is not an allowed image.
- Add a `headers()` block to both `next.config.ts` files.

### Required regression tests

- Assert `x-content-type-options`, `x-frame-options`/CSP `frame-ancestors`, and `referrer-policy` on a
  representative API response and on both Next apps' HTML responses.
- Assert `GET /uploads/:token` for an object whose bytes are not a recognized image returns 404, not
  `application/octet-stream`.

---

## SEC-009 — Authenticated API responses carry no `Cache-Control: no-store`

- **Severity:** MEDIUM
- **Confidence:** CONFIRMED
- **Category:** Caching of private data
- **Affected files:** every authenticated controller, e.g.
  `apps/api/src/reservations/customer-reservations.controller.ts:19-36`,
  `apps/api/src/reservations/staff-reservations.controller.ts:21-43`,
  `apps/api/src/reports/reports.controller.ts:22-61`,
  `apps/api/src/customer-profile/customer-profile.controller.ts:19-32`,
  `apps/api/src/auth/auth.controller.ts:83-97`

### Evidence

`configureApp` installs no response-header middleware and no controller sets `Cache-Control`. The only cache
directive in the entire API is `private, max-age=60` on the uploads download route
(`uploads.controller.ts:69`). Grep for `Cache-Control` across `apps/api/src` returns exactly one hit. No
`Vary: Cookie` is emitted anywhere.

### Attack scenario

1. Operations places a CDN or reverse proxy in front of `api.salonomia.example` (the normal deployment
   shape described in `docs/operations/deployment.md`).
2. `GET /salons/{id}/reservations?...` returns another tenant's customer names, emails, notes, and prices
   with **no** `Cache-Control` and **no** `Vary: Cookie`. A heuristically-caching intermediary is free to
   store and re-serve that response to the next requester of the same URL.
3. A `SALON_MANAGER` at salon A requests a URL; a `SALON_MANAGER` at salon B requests the same path shape;
   depending on the intermediary's cache key, the cached body containing salon A's customer PII is served to
   B. The same applies to `GET /auth/me`, `GET /customer/profile`, and `GET /superadmin/reports/audit-logs`.
4. On shared/kiosk machines, browser back-button and disk cache retain the JSON bodies after logout.

### Remediation

Add a global interceptor/middleware that sets `Cache-Control: no-store, private`, `Pragma: no-cache`, and
`Vary: Cookie, Origin` on every response except the `public/*` routes (which may keep a short, explicitly
chosen `public, max-age=...`).

### Required regression tests

- Every authenticated GET asserted to return `cache-control: no-store`.
- `GET /public/salons` asserted **not** to set `Set-Cookie`, so it can never poison a shared public cache
  with a session.

---

## SEC-010 — Upload token can overwrite an object after it passed image validation (TOCTOU)

- **Severity:** MEDIUM
- **Confidence:** PLAUSIBLE
- **Category:** File upload / content validation bypass
- **Affected files:**
  - `apps/api/src/uploads/uploads.controller.ts:16-48`
  - `apps/api/src/employees/portfolio/portfolio.service.ts:59-129`
  - `packages/storage/src/local-disk-adapter.ts:45-57,115-143`

### Evidence

```ts
// apps/api/src/uploads/uploads.controller.ts:25-47
const payload = adapter.verifyToken(token);
if (!payload || payload.purpose !== 'upload' || !payload.maxSizeBytes) {
  throw new NotFoundException();
}
...
await adapter.writeObjectWithLimit(payload.objectKey, req, payload.maxSizeBytes);
```

```ts
// apps/api/src/employees/portfolio/portfolio.service.ts:99-118
const head = await this.storage.readObjectHead(input.objectKey, 12);
if (!head || !detectImageMime(head)) {
  await this.storage.deleteObject(input.objectKey);
  throw new BadRequestException('Uploaded file is not a recognized image format.');
}
...
const item = await this.prisma.employeePortfolioItem.create({
  data: { employeeId, imageUrl: input.objectKey, ... },
});
```

The `PUT` handler validates only the token signature, purpose, and byte count — never the content. It is
also **not single-use**: the same token stays valid for its full 10-minute TTL
(`local-disk-adapter.ts:29`) and each `PUT` overwrites the object at the same key. Content validation is
performed once, later, in `confirm`.

### Attack scenario

1. A `SALON_ADMIN` requests an upload target: `POST /salons/S/employees/E/portfolio/upload-url` returns a
   signed URL valid for 10 minutes.
2. They `PUT` a legitimate JPEG.
3. They `POST /salons/S/employees/E/portfolio` with the `objectKey`. `confirm` reads the first 12 bytes,
   sees the JPEG magic number, accepts, and persists the `EmployeePortfolioItem`. The item is now publicly
   reachable — `PublicSalonsService.detail` mints a download URL for it
   (`apps/api/src/public/public-salons.service.ts:219-226`).
4. Within the remaining TTL, the attacker replays the **same** upload token with arbitrary bytes. The object
   is silently replaced. The stored, already-approved portfolio item now points at attacker-chosen content
   served from the API origin.
5. Because `GET /uploads/:token` emits `application/octet-stream` for unrecognized content with no `nosniff`
   and no `Content-Disposition` (SEC-008), the API origin becomes an arbitrary-content host — useful for
   malware distribution under a trusted brand, and a stepping stone for sniffing-based XSS in any client
   lenient about content type.

There is also no validation that the uploaded bytes' sniffed type matches the extension implied by the
`objectKey` (`employees/<uuid>/<uuid>.(jpg|png|webp)`) — a PNG can be stored at a `.jpg` key.

### Remediation

- Make upload tokens single-use (record consumed token ids, or include a nonce checked against a short-lived
  store) and shorten the TTL.
- Validate magic bytes **during** `writeObjectWithLimit` (sniff the first chunk, abort on mismatch), not only
  at confirm time.
- Re-verify content at read time in `UploadsController.get` and 404 anything that is not a recognized image.
- Assert the sniffed MIME matches the extension in the object key.

### Required regression tests

- Reusing an upload token after a successful `confirm` returns 404/409.
- `PUT`ing non-image bytes is rejected at write time (413/400), not silently stored.
- `GET /uploads/:token` for an object holding HTML/JS returns 404.

---

## SEC-011 — `bufferMinutes` is enforced only in application code, never by the DB constraint

- **Severity:** MEDIUM
- **Confidence:** CONFIRMED
- **Category:** Reservation race condition / business-rule bypass
- **Affected files:**
  - `packages/database/prisma/migrations/20260805204128_reservation_overlap_exclusion/migration.sql:8-14`
  - `apps/api/src/reservations/reservations.service.ts:141,146-160`
  - `apps/api/src/reservations/availability/availability.ts:90-93,250-256`
  - `apps/api/src/reservations/transitions.service.ts:320-340`

### Evidence

```sql
-- migration 20260805204128
ALTER TABLE "Reservation"
  ADD CONSTRAINT "reservation_no_overlap_per_employee"
  EXCLUDE USING gist ("employeeId" WITH =, tstzrange("startAt", "endAt") WITH &&)
  WHERE (status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN'));
```

```ts
// apps/api/src/reservations/reservations.service.ts:141
const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000); // buffer NOT included
```

```ts
// apps/api/src/reservations/availability/availability.ts:250-253
const busySpans: Array<{ start: Date; end: Date }> = [
  ...employee.timeOff.map((t) => ({ start: t.startAt, end: t.endAt })),
  ...employee.blockingReservations.map((r) => ({ start: r.startAt, end: r.endAt })), // no trailing buffer
];
```

Two independent gaps:

1. **Concurrency gap.** The buffer check lives in `isEmployeeSlotAvailable`, which runs _before_ the
   transaction on a snapshot loaded outside it (`reservations.service.ts:116-136`). The in-transaction
   re-check (`:150-157`) compares only `startAt < endAt && endAt > startAt` — no buffer. The DB constraint
   ranges are `[startAt, endAt)` — no buffer. So the buffer has **no** serialization point.
2. **Asymmetry gap.** A candidate's busy span is `[start, start + duration + buffer)`, but an _existing_
   reservation contributes only `[start, end)` to `busySpans`. Booking B starting exactly at A's `endAt`
   therefore passes even single-threaded, silently violating A's trailing buffer.

### Attack scenario

1. Salon has a 45-minute service with `bufferMinutes = 15`. Employee E is free 09:00-18:00.
2. Attacker (an ordinary CUSTOMER, or two colluding customers) fires two concurrent `POST /reservations`
   with distinct `idempotencyKey`s: one for `09:00` and one for `09:45`.
3. Both requests load their availability snapshot before either transaction commits. Each sees the other's
   slot as free.
4. Both commit. The ranges `[09:00,09:45)` and `[09:45,10:30)` do not overlap, so the `EXCLUDE` constraint
   does not fire and the in-transaction count returns 0.
5. The stylist is now double-committed with zero turnaround time. Repeating this across a day lets an
   attacker pack an employee's entire schedule beyond the salon's actual capacity — a denial-of-service
   against a specific stylist with real financial and reputational impact for the tenant.

Even without a race, step 2 succeeds sequentially because of the asymmetry gap.

### Remediation

- Persist the buffered span (e.g. a generated `blockedUntil = endAt + bufferMinutes`) and change the
  `EXCLUDE` constraint to `tstzrange("startAt", "blockedUntil")`, so the database — not the application — is
  the serialization point.
- Include each existing reservation's trailing buffer in `busySpans` in both `computeEmployeeSlots` and
  `isEmployeeSlotAvailable`.
- Apply the same to the reschedule path (`transitions.service.ts:320-340`).

### Required regression tests

- Two truly concurrent `POST /reservations` for back-to-back slots separated by less than
  `duration + buffer`: exactly one succeeds, the other gets 409.
- Sequential booking at exactly `previousReservation.endAt` with a non-zero buffer: 409.
- Same two tests for `POST /salons/:salonId/reservations/manual` and for both reschedule endpoints.

---

## SEC-012 — Idempotency replay returns a stale reservation for a different payload

- **Severity:** LOW
- **Confidence:** CONFIRMED
- **Category:** Idempotency semantics
- **Affected files:** `apps/api/src/reservations/reservations.service.ts:60-70,202-212`,
  `packages/validation/src/reservations.ts:9-23`, `packages/database/prisma/schema.prisma:318-322,335`

### Evidence

```ts
// apps/api/src/reservations/reservations.service.ts:64-70
const existing = await this.prisma.reservation.findUnique({
  where: { customerId_idempotencyKey: { customerId, idempotencyKey: input.idempotencyKey } },
  select: RESERVATION_SELECT,
});
if (existing) {
  return existing;
}
```

The key is fully client-chosen, is scoped only by `customerId` (never by salon/service/time), and the request
payload is **not** fingerprinted. Any subsequent request reusing the key returns the original reservation
with HTTP 201, regardless of what was actually asked for.

### Attack scenario / impact

1. The web client persists `idempotencyKey` in `sessionStorage` and reuses it across draft edits
   (`apps/web/app/salons/[slug]/book/_components/BookingContext.tsx:81-140` — `ensureKey` deliberately
   reuses `prev.idempotencyKey` when the service, stylist, **or time** changes).
2. A customer books 09:00, goes back, changes the time to 15:00, and submits. The API finds the existing key
   and returns the **09:00** reservation with a 201, so the UI reports success for an appointment the
   customer did not want and did not knowingly keep.
3. The key never expires, so a key reused weeks later still resolves to a long-past reservation.

This is primarily a correctness and support-burden issue, but it is also a silent-failure surface that hides
genuine booking conflicts from the customer.

### Remediation

- Store a hash of the canonicalized request payload alongside the key; on replay with a _different_ hash,
  return 409 rather than the stale record.
- Expire idempotency keys (e.g. 24h) so they cannot resolve indefinitely.
- Mint a fresh key whenever the draft's service/stylist/time changes in `BookingContext`.

### Required regression tests

- Same key plus a different `startAt`: 409, not 201-with-old-reservation.
- Same key plus an identical payload: same reservation id, exactly one row created.

---

## SEC-013 — `RolesGuard`'s CUSTOMER branch is role-blind and leaves `salonContext` undefined

- **Severity:** LOW
- **Confidence:** CONFIRMED
- **Category:** Authorization design fragility
- **Affected files:** `apps/api/src/authz/roles.guard.ts:39-43`

### Evidence

```ts
// apps/api/src/authz/roles.guard.ts:39-43
// CUSTOMER-only routes have no :salonId — ownership is checked by the handler's own query
// (docs/security/authorization.md), not by this guard.
if (requiredRoles.length === 1 && requiredRoles[0] === 'CUSTOMER') {
  return true;
}
```

### Assessment and attack scenario

Every current `@Roles('CUSTOMER')` handler was verified to scope by the session user id and is therefore
**not exploitable today**:

- `customer-reservations.service.ts:47,66` uses `where: { customerId }` and `where: { id, customerId }`
- `transitions.service.ts:192-199` — `findForCustomer` uses `where: { id, customerId }`
- `customer-profile.service.ts:30,43` uses `where: { id: userId }`
- `reservations.service.ts:60` takes `customerId` from the session

The finding is that the guard provides **no** authorization for this branch — it is a bare `return true` for
any authenticated principal, including `SALON_MANAGER`s, staff of suspended salons, and SUPERADMINs — and it
does not populate `request.salonContext`. The invariant "the handler always scopes by `@CurrentUser().id`"
is unenforced and unexpressed in types. The first `@Roles('CUSTOMER')` handler that takes an id from the
route or body instead of the session becomes an immediate full IDOR across every customer on the platform,
and it will pass every existing guard test (`roles.guard.e2e.test.ts:235` explicitly asserts this permissive
behaviour is intended).

Secondarily, a handler in this branch that reads `@CurrentSalonContext()` receives `undefined`, which will
either crash (500) or, worse, be spread into a Prisma `where` as `undefined` — which Prisma treats as
"filter absent", silently removing the tenant scope.

### Remediation

- Introduce an explicit `@SelfScoped()` marker plus a lint or unit check that every `@Roles('CUSTOMER')`
  handler passes `user.id` into its service call.
- Have the guard set a minimal `request.principalContext = { userId, scope: 'SELF' }` and have the
  self-scoped services take that object rather than a bare string, so an omitted scope is a type error.
- Consider denying staff-only principals on customer routes, or at least auditing when a non-customer
  principal uses them.

### Required regression tests

- A `SALON_MANAGER` calling `GET /customer/reservations` sees only their own reservations (0 rows), never
  their salon's.
- A unit test over the Nest route table asserting no `@Roles('CUSTOMER')` handler injects
  `@CurrentSalonContext()`.

---

## SEC-014 — SUPERADMIN bypass accepts an unvalidated, non-existent `salonId` into `SalonContext`

- **Severity:** LOW
- **Confidence:** CONFIRMED
- **Category:** Input validation / audit integrity
- **Affected files:** `apps/api/src/authz/roles.guard.ts:45-77`

### Evidence

```ts
// apps/api/src/authz/roles.guard.ts:45-46,65-76
const salonIdParam = request.params.salonId;
const salonId = Array.isArray(salonIdParam) ? salonIdParam[0] : salonIdParam;
...
if (user.isSuperadmin && requiredRoles.includes('SUPERADMIN')) {
  await this.audit.record({
    actorUserId: user.id,
    action: 'superadmin.context_entry',
    targetType: 'Salon',
    targetId: salonId,
    salonId,
    metadata: { route: request.route?.path, method: request.method },
  });
  const salonContext: SalonContext = { salonId, role: 'SUPERADMIN', isSuperadminBypass: true };
  request.salonContext = salonContext;
  return true;
}
```

The superadmin branch never checks that `salonId` names a real salon (contrast the membership branch, which
implicitly does). Most salon-scoped controllers do not declare a `salonId` param at all
(`staff-transitions.controller.ts`, `staff-reservations.controller.ts`, `reports.controller.ts`), so no
`ParseUUIDPipe` runs on it and `SalonContext.salonId` can be any URL-safe string.

### Impact / scenario

1. A SUPERADMIN (or anything that ever obtains `isSuperadmin`) requests
   `GET /salons/does-not-exist/reports?from=2026-01-01&to=2026-01-02`.
2. An `AuditLog` row is written recording a `superadmin.context_entry` into a salon that does not exist,
   polluting the audit trail with attacker-chosen `salonId` values _before_ any authorization outcome is
   known. Because this branch audits before the handler runs, the audit log records "entry" for requests
   that were never valid.
3. Downstream services run `where: { salonId: '<garbage>' }` and return empty results rather than 404,
   producing confusing "everything is empty" responses instead of a clean error.

### Remediation

- Apply UUID validation to `salonId` inside the guard (reject non-UUID with 404).
- Resolve the salon row in the superadmin branch and 404 if absent, before writing the audit event.
- Record the audit event with the request outcome, not just the attempt.

### Required regression tests

- Superadmin request with a non-UUID `salonId`: 404 and **no** `superadmin.context_entry` audit row.
- Superadmin request with a well-formed but non-existent salon UUID: 404.

---

## SEC-015 — `acceptInvitation` ignores account/salon status and 500s on a duplicate membership

- **Severity:** LOW
- **Confidence:** CONFIRMED
- **Category:** Error handling / state validation
- **Affected files:** `apps/api/src/auth/auth.service.ts:154-195`

### Evidence

```ts
// apps/api/src/auth/auth.service.ts:158-181
if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) { return null; }
const existingUser = await this.prisma.user.findUnique({ where: { email: invitation.email } });
...
await tx.salonMembership.create({
  data: { userId: resolvedUser.id, salonId: invitation.salonId, role: invitation.role },
});
```

No check on `existingUser.status`, no check on the invitation's `Salon.status`, and `salonMembership.create`
against a `@@unique([userId, salonId])` pair. A user who already holds a membership at that salon (for
example, previously a `SALON_MANAGER` and re-invited as `SALON_ADMIN`) triggers a Prisma `P2002` that is not
caught, surfacing as an unhandled 500. A `SUSPENDED` user can obtain an active session through this route,
bypassing the suspension that `deserializeUser` otherwise enforces.

### Remediation

Check `existingUser.status === 'ACTIVE'` and `salon.status === 'ACTIVE'` (returning the same generic
"invalid or expired" response), and use `upsert` for the membership.

### Required regression tests

- Acceptance by a `SUSPENDED` user: 401 with the generic message.
- Acceptance where a membership already exists: 409, never 500.
- Acceptance for a `SUSPENDED` salon: 401 generic.

---

## SEC-016 — Manual staff bookings have no idempotency protection

- **Severity:** LOW
- **Confidence:** CONFIRMED
- **Category:** Duplicate submission
- **Affected files:** `apps/api/src/reservations/reservations.service.ts:237-383`,
  `packages/validation/src/reservations.ts:31-41`, `packages/database/prisma/schema.prisma:318-322`

`createManualReservationSchema` has no `idempotencyKey`, and `createManual` performs no replay check. A
double-clicked or retried manual booking for a _different_ time creates duplicate reservations for the same
customer; only exactly-overlapping ones are stopped by the `EXCLUDE` constraint. Combined with SEC-002, each
retry also re-triggers user-record lookup/creation for the supplied email.

**Remediation:** accept an optional `idempotencyKey` on the manual schema and reuse the same
`customerId_idempotencyKey` lookup path.
**Regression test:** two identical manual-booking requests with the same key produce exactly one reservation.

---

## SEC-017 — Customer cancel/reschedule works on suspended salons

- **Severity:** LOW
- **Confidence:** CONFIRMED
- **Category:** Business-rule bypass / suspension enforcement
- **Affected files:** `apps/api/src/reservations/transitions.service.ts:127-168,192-199`

`findForCustomer` scopes by `{ id, customerId }` only. Neither `cancelByCustomer` nor `rescheduleByCustomer`
consults `Salon.status`, so after a salon is suspended (`salons.service.ts:279-329`) customers can still
mutate its reservations — including **rescheduling into new future slots at a suspended tenant**, which
contradicts the suspend semantics `RolesGuard` enforces for staff (`roles.guard.ts:84-94`) and that
`docs/product/acceptance-criteria.md` section 11.4 describes.

**Remediation:** load the salon status in `findForCustomer` and reject reschedule (while still allowing
cancel) for non-`ACTIVE` salons, with the product decision recorded in an ADR.
**Regression test:** suspend a salon, then assert a customer reschedule returns 409 while cancel still
succeeds.

---

## SEC-018 — `fetchApiServer` does not default to `no-store`

- **Severity:** LOW
- **Confidence:** CONFIRMED
- **Category:** Latent cross-user cache poisoning
- **Affected files:** `apps/web/lib/fetch-api-server.ts:19-29`

```ts
export async function fetchApiServer<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('connect.sid');
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionCookie ? { Cookie: `${sessionCookie.name}=${sessionCookie.value}` } : {}),
      ...init?.headers,
    },
  });
```

Both current call sites correctly pass `{ cache: 'no-store' }`
(`app/account/reservations/page.tsx:59-61`, `app/salons/[slug]/book/result/[reservationId]/page.tsx:43-46`),
and Next 15's default is already `no-store`, so this is **not currently exploitable**. It is a latent
cross-user risk: this helper forwards a session cookie yet leaves caching to each caller's discipline. A
Next config change (`fetchCache`, `staleTimes`) or one forgetful call site would silently place another
user's private JSON into the shared Data Cache.

**Remediation:** hard-code `cache: 'no-store'` **after** the `...init` spread so callers cannot override it,
and add `export const dynamic = 'force-dynamic'` to the private route segments.
**Regression test:** unit-assert the outgoing `RequestInit` always contains `cache: 'no-store'`, even when a
caller passes `cache: 'force-cache'`.

---

## SEC-019 — Placeholder secrets are accepted; secret strength is under-validated

- **Severity:** LOW
- **Confidence:** CONFIRMED
- **Category:** Secrets management
- **Affected files:** `apps/api/src/config/env.ts:9-19`, `packages/storage/src/factory.ts:5-11,31-35`,
  `.env:7,11` (untracked — confirmed absent from `git ls-files`)

```ts
// apps/api/src/config/env.ts:12
SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters'),
```

The local `.env` (correctly gitignored, correctly untracked) contains
`SESSION_SECRET=replace-with-a-long-random-string` and
`LOCAL_STORAGE_SIGNING_SECRET=dev-only-local-storage-signing-secret-do-not-use-in-prod`. Both exceed 16
characters, so `validateApiEnv` would accept them verbatim in **production**.
`LOCAL_STORAGE_SIGNING_SECRET` is not validated by the env schema at all — it is only `required()`-checked
at adapter construction — and it is the sole thing standing between an attacker and forging arbitrary
upload/download tokens (`packages/storage/src/local-token.ts:15-19`); a forged upload token yields arbitrary
writes into the storage namespace.

**Remediation:** raise the minimum to 32 bytes of entropy, reject a denylist of known placeholder strings
when `NODE_ENV === 'production'`, and move `LOCAL_STORAGE_SIGNING_SECRET` into `apiEnvSchema`.
**Regression test:** `validateApiEnv` with `NODE_ENV=production` and a placeholder secret throws.

---

## SEC-020 — Audit log completeness and exposure gaps

- **Severity:** LOW
- **Confidence:** CONFIRMED
- **Category:** Audit / observability
- **Affected files:** `apps/api/src/audit/audit.service.ts:5-30`,
  `apps/api/src/authz/roles.guard.ts:52-61,62,93`, `apps/api/src/reports/reports.service.ts:121-158`,
  `packages/database/prisma/schema.prisma:365-377`

Positives first: no secrets, tokens, or password hashes are written to `AuditLog`; salon-scoped audit reads
are correctly filtered by the authorized `ctx.salonId` (`reports.controller.ts:31-38` then
`reports.service.ts:122`), and the e2e suite already asserts cross-salon audit isolation.

Gaps:

1. **No request context.** `AuditEventInput` has no `ipAddress`, `userAgent`, or request id, so an
   investigation cannot distinguish a legitimate admin action from a session-hijacked one.
2. **No read/export events.** Viewing another tenant's reports, listing every reservation with customer PII,
   and reading audit logs themselves are all unaudited. Under SEC-002, PII harvesting via manual booking
   leaves only `reservation.created` rows.
3. **Attempts audited, denials not.** `superadmin.platform_action` (`roles.guard.ts:52-59`) and
   `superadmin.context_entry` (`:65-73`) are written from the guard _before_ the handler runs, so a request
   that subsequently 404s or 500s still records a successful-looking "entry". Denied attempts, by contrast,
   are **not** audited at all (`throw new NotFoundException()` at `:62` and `:93` writes nothing) — so a
   broad cross-tenant probing campaign is completely invisible in the audit trail.
4. **Raw metadata exposure.** `reports.service.ts:151-154` returns each row's full `metadata` JSON to any
   `SALON_ADMIN`. Today that is benign, but nothing constrains what future call sites put in `metadata`; the
   type is `Prisma.InputJsonValue` with only a comment as a guard.

**Remediation:** add `ipAddress`/`userAgent`/`requestId` columns; audit authorization _denials_ and sensitive
reads; move the superadmin audit to an interceptor that records the outcome; introduce a typed metadata union
per action and redact unknown keys on read.
**Regression tests:** a cross-tenant denial produces an `authz.denied` audit row; a denied request produces
no `*.context_entry` row.

---

## SEC-021 — `logout` throws inside an Express callback

- **Severity:** LOW
- **Confidence:** PLAUSIBLE
- **Category:** Availability / error handling
- **Affected files:** `apps/api/src/auth/auth.controller.ts:69-81`

```ts
req.logout((err) => {
  if (err) throw err;
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.status(200).json({ ok: true });
  });
});
```

`throw` inside an asynchronous Express/Passport callback escapes Nest's exception filter entirely and
surfaces as an `uncaughtException`. Under Node's default policy the process exits. An attacker who can
induce a session-store error during logout (for example by exhausting the `pg` pool with concurrent
requests, or during a brief database blip) turns every in-flight logout into a process crash — a low-effort
availability issue that also drops every other user's in-flight request.

**Remediation:** convert to
`await new Promise<void>((resolve, reject) => req.logout((err) => (err ? reject(err) : resolve())))` and let
Nest handle the rejection; register a `process.on('uncaughtException')` backstop.
**Regression test:** mock a `logout` error and assert a 500 JSON response rather than a process exit.

---

## SEC-022 — CORS and cookie defaults are permissive-by-fallback

- **Severity:** INFO
- **Confidence:** CONFIRMED
- **Affected files:** `apps/api/src/config/env.ts:15-18`, `apps/api/src/configure-app.ts:16,27-32`

```ts
CORS_ORIGINS: z
  .string()
  .default('http://localhost:3000,http://localhost:3001')
  .transform((value) => value.split(',').map((origin) => origin.trim())),
```

```ts
app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
```

The allowlist is correctly an array (never a wildcard) with `credentials: true`, which is the right shape.
Three observations:

1. If `CORS_ORIGINS` is unset in production the app silently allows only `localhost:3000/3001`. The app will
   appear broken rather than insecure, but the failure is silent and undiagnosable from config alone. Add a
   production assertion that no allowlisted origin is `localhost`/`127.0.0.1` and that every entry is
   `https:`.
2. `sameSite: 'lax'` on the session cookie only works if the API and the two Next apps are same-site. If the
   API is ever deployed on an unrelated registrable domain, the cookie will not be sent on cross-site XHR,
   and the predictable fix under pressure is `sameSite: 'none'` — which materially weakens the CSRF story in
   SEC-007. Document the same-site deployment requirement explicitly.
3. Session `maxAge` is a fixed 7 days with `rolling` unset and no idle timeout. There is no
   re-authentication step for sensitive operations (salon suspend, password change, superadmin actions).

---

## SEC-023 — Validation error bodies echo unrecognized key names

- **Severity:** INFO
- **Confidence:** CONFIRMED
- **Affected files:** `apps/api/src/common/zod-validation.pipe.ts:9-15`,
  `apps/api/src/common/zod-body.guard.ts:10-18`

```ts
if (!result.success) {
  throw new BadRequestException(result.error.flatten());
}
```

Because every schema uses `.strict()`, a probe body reveals which keys are recognized via Zod's
"Unrecognized key(s) in object" message. This is a minor schema-fingerprinting aid for an attacker mapping
the API; it does not leak stack traces, internal paths, or database structure. Nest's default 500 handler was
verified not to leak stack traces, and no `console.*` logging of any kind exists in `apps/api/src`.

**Remediation (optional):** return a stable field-level error shape without echoing unknown key names in
production.

---

## SEC-024 — Public availability endpoint exposes per-stylist occupancy

- **Severity:** INFO
- **Confidence:** CONFIRMED
- **Affected files:** `apps/api/src/public/public-salons.service.ts:266-353`,
  `apps/api/src/public/public-salons.controller.ts:11-30`

`GET /public/salons/:slug/availability?serviceId=&date=&employeeId=` is unauthenticated (intentionally) and
correctly scopes employees by `salonId` and returns no PII. However, by differencing the returned slot list
against the employee's working schedule (also public, via `PublicSalonsService.detail` and its
`approximateOpeningHours`, derived from the same data), an unauthenticated observer can reconstruct exactly
when each named stylist is booked, and by polling can observe bookings appear in near-real time. This is
inherent to publishing per-stylist availability and is presumably an accepted product trade-off, but it
deserves an explicit entry in `docs/security/data-classification.md` and a dedicated rate limit — the
endpoint is currently subject only to the global 120/min bucket, which SEC-005 makes shared platform-wide.

---

## Verified-secure controls (no finding)

These were specifically probed and found sound; they should stay protected by the existing tests:

- **Tenant isolation on every salon-scoped query.** `SalonContext.salonId` (never `request.params`) is
  threaded into the `where` clause of both reads and writes across employees, breaks, time-off, working
  schedules, employee-services, services, service categories, portfolio, staff reservations, transitions,
  and reports. `salon-context.ts:5-10` states the rule and the code follows it. Cross-salon IDOR was not
  reproducible on any reviewed route.
- **Fail-closed authorization.** A handler with no `@Roles()` is denied, not allowed
  (`roles.guard.ts:27-30`). Suspended memberships and suspended salons are both rejected (`:87-94`).
  SUPERADMIN cannot enter a route whose `@Roles()` omits `SUPERADMIN` (`:65`).
- **No session fixation.** Passport 0.7's `SessionManager.logIn` regenerates the session before serializing
  the user (verified in the installed `passport@0.7.0/lib/sessionmanager.js:24-54`).
- **Mass assignment.** Every request schema reviewed uses `.strict()`, and services build update payloads
  field-by-field from an explicit allowlist rather than spreading the body
  (`salons.service.ts:242-255`, `employees.service.ts:126-131`, `customer-profile.service.ts:36-41`).
  Price, duration, and status are never accepted from any client.
- **Path traversal on storage.** `LocalDiskStorageAdapter.resolvePath` enforces a strict object-key regex
  **and** a resolved-prefix check (`local-disk-adapter.ts:34-43`); the upload token is HMAC-verified with
  `timingSafeEqual` and TTL-checked (`local-token.ts:22-44`). SVG and all executable MIME types are off the
  allowlist (`packages/validation/src/portfolio.ts:6`). Upload size is bounded both by a validated schema
  (5 MiB) and by a streaming byte counter that deletes the partial file
  (`local-disk-adapter.ts:115-143`), so a forged `Content-Length` does not help.
- **Double-booking (exact overlap).** Guaranteed by a Postgres `EXCLUDE USING gist` constraint filtered to
  active statuses, with the application check as a fast path only — the correct architecture. The `P2002`
  and exclusion-violation handlers convert races into 409s rather than 500s
  (`reservations.service.ts:198-214`).
- **State-machine transitions.** `applyStatus` performs a compare-and-swap
  (`where: { id, status: current.status, salonId }`) so concurrent transitions produce 409, not a lost
  update (`transitions.service.ts:215-222`).
- **Enumeration resistance** at login and forgot-password, with identical responses and generic messages
  (`auth.service.ts:60-94,105-125`), plus argon2id hashing and hash-only token storage.
- **Secrets hygiene.** No hardcoded secrets in source, no `console.*` logging anywhere in `apps/api/src`,
  `.env` is gitignored and confirmed untracked, and seed data is explicitly labelled non-production and
  refuses to run under `NODE_ENV=production` (`packages/database/prisma/seed.ts:7-9`).
- **Dashboard authorization** is entirely API-enforced; the dashboard is client-rendered and performs no
  server-side data fetch that could leak another tenant's data into pre-rendered HTML.

---

## Summary

| Severity  | Count  | IDs                                                                                      |
| --------- | ------ | ---------------------------------------------------------------------------------------- |
| CRITICAL  | 0      | —                                                                                        |
| HIGH      | 2      | SEC-001, SEC-002                                                                         |
| MEDIUM    | 9      | SEC-003, SEC-004, SEC-005, SEC-006, SEC-007, SEC-008, SEC-009, SEC-010, SEC-011          |
| LOW       | 10     | SEC-012, SEC-013, SEC-014, SEC-015, SEC-016, SEC-017, SEC-018, SEC-019, SEC-020, SEC-021 |
| INFO      | 3      | SEC-022, SEC-023, SEC-024                                                                |
| **Total** | **24** |                                                                                          |

**By confidence:** 21 CONFIRMED, 3 PLAUSIBLE (SEC-007, SEC-010, SEC-021).

**By category:**

| Category                                 | IDs                                |
| ---------------------------------------- | ---------------------------------- |
| Broken access control / account takeover | SEC-001, SEC-013, SEC-014          |
| Cross-tenant leakage                     | SEC-002, SEC-009                   |
| Session / authentication lifecycle       | SEC-004, SEC-015, SEC-022          |
| CSRF                                     | SEC-007                            |
| Reservation concurrency / idempotency    | SEC-011, SEC-012, SEC-016, SEC-017 |
| File upload                              | SEC-010, SEC-008 (partly)          |
| Open redirect                            | SEC-003                            |
| Rate limiting / availability             | SEC-005, SEC-006, SEC-021, SEC-024 |
| Transport and header hardening           | SEC-008, SEC-009, SEC-022          |
| Secrets / configuration                  | SEC-019, SEC-006                   |
| Audit and observability                  | SEC-020, SEC-014                   |
| Information leakage                      | SEC-023, SEC-024                   |

### Recommended remediation order

1. **SEC-001** — invitation acceptance is the only path to a full cross-tenant account takeover from an
   unauthenticated starting point.
2. **SEC-002** — a `SALON_MANAGER` can enumerate and de-anonymize the entire platform user base today.
3. **SEC-005 / SEC-006** — prerequisites for every other rate-limit and cookie control being real in
   production.
4. **SEC-004, SEC-003, SEC-011** — account-recovery correctness, the phishing amplifier, and the one
   reservation invariant not backed by the database.
5. **SEC-007 / SEC-008 / SEC-009 / SEC-010** — defence-in-depth layers that currently do not exist.
6. Remaining LOW and INFO items as hardening.

Per `CLAUDE.md`, **every fix above must land with the regression test listed in its section**, and no
existing security control may be weakened to make a test pass.
