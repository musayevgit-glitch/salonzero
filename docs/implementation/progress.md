# Implementation Progress

Format per task: section | task | status | commit | tests | risks | next.

## Section 1 — Create the Empty Project

Status: done (retro-fixed). Repo initialized, docs/ created, source docs moved into docs/.
Commit: 6d24883
Tests: n/a
Risks: none
Next: —

## Section 2 — Bootstrap Claude Project Governance

Status: done (prior session). CLAUDE.md + 6 skills + 5 agents created.
Commit: 6d24883 (re-included in repo init commit; not previously committed since no git repo existed)
Tests: n/a
Risks: none
Next: —

## Section 3 — Apple-Inspired Luxury Web Skill

Status: done (created as part of Section 2 governance bootstrap).
Commit: 6d24883
Tests: n/a
Risks: none
Next: —

## Section 4 — Product Specification (Phase 0)

Status: done. Created docs/product/{product-spec,role-permission-matrix,domain-glossary,user-flows,
acceptance-criteria,out-of-scope,open-decisions}.md
Commit: pending (this task)
Tests: n/a (docs only)
Risks: 5 open business decisions recorded in open-decisions.md with assumed safe defaults — owner should
confirm before the relevant milestone (guest booking, manager-invite policy, default booking policy,
multi-service reservations, OAuth providers).
Next: Section 5 — Architecture and Threat Model

## Section 5 — Architecture and Threat Model

Status: done. Created docs/architecture/{system-overview,context-diagram,container-diagram,
component-boundaries,request-flows,tenant-isolation,error-handling,observability}.md,
docs/security/{threat-model,security-requirements,data-classification}.md,
docs/adr/000{1..5}-*.md. Threat-model review performed inline by main agent (Sonnet), not via opus
subagents, per this session's caveman token-saving mode (no Opus, no subagent unless independently
required). No critical/high gaps found at doc stage — no code exists yet.
Commit: pending (this task)
Tests: n/a (docs only)
Risks: threat model must be re-run against real code at Phase 12; ADR-0003 auth library not finalized
(deferred to Phase 9); Docker still missing, blocks Section 6/8 Postgres setup.
Next: Section 6 — Repository Foundation

## Section 6 — Repository Foundation

Status: done. pnpm workspaces + Turborepo monorepo scaffolded: apps/{api,web,dashboard},
packages/{config,validation,auth,database,contracts,ui}. NestJS api has a health endpoint + Zod env
validation at bootstrap (no auth/roles/salon code, per constraint). Next.js web/dashboard are minimal
App Router shells. Prisma schema has datasource/generator only (models land Phase 3). Root tooling:
ESLint 9 flat config, Prettier, Vitest per package, Playwright config + 1 smoke spec (not wired into
`pnpm test`, browsers not installed — run manually), GitHub Actions CI, docker-compose.yml for Postgres,
.env.example, README.
Commit: pending (this task)
Tests: `pnpm install/format:check/lint/typecheck/test/build` all pass (7 real unit tests: env validation
×5, roles ×1, health controller ×1; rest are documented Phase-N placeholders). Full command output
verified, not assumed.
Risks: Docker not installed in this environment — docker-compose.yml is written but never actually run
here; Postgres/Prisma migrations are untested against a live DB until Phase 3. Playwright browsers not
installed (`pnpm exec playwright install` still needed before `pnpm test:e2e` works). Prisma flagged a
major version update (6→7) available; stayed on 6.x pinned range, revisit via ADR if needed.
Next: Section 7 — Design Foundations Before Product UI

## Section 7 — Design Foundations Before Product UI

Status: done. Docs: docs/design/{design-principles,information-architecture,navigation-model,
responsive-strategy,content-style}.md, docs/adr/0007-design-system.md. Design system in packages/ui:
tokens.css (Tailwind v4 @theme, semantic color/radius/shadow/motion/z-index/content-width tokens) +
28 components (Button, IconButton, Link, Input, Textarea, Select, Checkbox, RadioGroup, FormField,
Alert, Toast/ToastProvider, Badge, Card, List/ListItem, Table, MobileRecordList, Pagination, Dialog,
ConfirmDialog, Drawer, DropdownMenu, Tabs, Breadcrumbs, Skeleton, EmptyState, ErrorState,
PermissionDeniedState, PublicShell, DashboardShell). Radix UI used for dialog/dropdown/tabs/checkbox/
radio/toast (real accessibility complexity); native elements for input/textarea/select/button.
Tailwind v4 wired into apps/web and apps/dashboard via @tailwindcss/postcss. Dev-only component
showcase at apps/web /dev/showcase (404s in production builds). UI review performed inline by main
agent (Sonnet), not a subagent, per caveman token-saving mode (UI review isn't the security-critical
carve-out).
Commit: pending (this task)
Tests: 4 Vitest component tests (Button ×2, FormField ×1, Badge ×1) + 1 Playwright axe-core
accessibility smoke test against the showcase route (not yet run — Playwright browsers still not
installed in this environment). Full `install/format:check/lint/typecheck/test/build` gate passed.
Visually spot-checked showcase page in-browser at 1280px and 375px (screenshots): warm neutral
palette, terracotta accent, badges/forms/alerts render correctly, no horizontal overflow on mobile.
Risks: (1) exact WCAG contrast ratios for --color-accent/--color-warning against their backgrounds were
not run through an automated contrast checker — spot-checked visually only, recommend a real audit
before Phase 12. (2) Table + MobileRecordList are two separate components a page author must both
render (`hidden md:block` / `md:hidden`) — no single component enforces pairing them; documented in
code comments but worth a lint rule or combined component later if misuse shows up. (3) Playwright
accessibility test not actually executed (no browsers installed) — written and reviewed only.
(4) 1024px checkpoint not visually spot-checked this session (1280px and 375px were).
Next: Section 8 — Database Domain Model

## Section 8 — Database Domain Model

Status: done. Docs: docs/architecture/data-model.md (per-entity tenant ownership/identity/lifecycle/
uniqueness/indexes/FKs/deletion/audit/privacy), docs/architecture/data-retention.md,
docs/adr/0006-deletion-and-retention.md. Full Prisma schema in packages/database/prisma/schema.prisma:
User, SalonMembership, Salon, BookingPolicy, ServiceCategory, Service, EmployeeProfile,
EmployeePortfolioItem, EmployeeService, WorkingSchedule, Break, TimeOff, Reservation,
ReservationStatusHistory, AuditLog, Notification — all typed enums (no free-form role strings), money
as Int minor-units + currency, UTC via `@db.Timestamptz(3)`, Restrict FKs on everything Reservation
references (soft-delete-only policy per ADR-0006). Two migrations: `init` (Prisma-generated) +
`reservation_overlap_exclusion` (hand-written raw SQL: `EXCLUDE USING gist` on
`(employeeId, tstzrange(startAt,endAt))` for PENDING/CONFIRMED/CHECKED_IN + a `startAt < endAt` CHECK
constraint) — both migrations carry a documented manual rollback plan in comments since Prisma doesn't
generate down-migrations. Dev seed script (`prisma/seed.ts`, fake data only, refuses to run when
NODE_ENV=production). Database review performed inline by main agent (Sonnet), not the database-reviewer
subagent — this environment's Agent tool doesn't expose the custom `.claude/agents/database-reviewer.md`
definition as an invokable subagent type, so an equivalent checklist pass (cross-tenant FKs, indexes,
cascades, nullability, money, timezone, concurrency, audit immutability, rollback risk) was done directly
and is recorded here instead of a separate report.
Environment resolved: Docker was never installed in this environment, but this machine already has
Postgres.app (PG 18) installed with an existing cluster (also hosting an unrelated `aurabloom` database,
left untouched). Started that Postgres server and created an isolated `salonomia` role + database
(`CREATEDB` granted to the role for Prisma's shadow-database use) rather than waiting on Docker — same
end result (a real local Postgres to migrate/test against), different mechanism than the playbook's
docker-compose assumption. `docker-compose.yml` is left in place and still correct for machines that do
have Docker.
Commit: pending (this task)
Tests: 9 real Vitest tests against the live local Postgres DB (not mocked) — tenant-ownership NOT NULL
enforcement, 3 uniqueness-constraint tests, 2 Restrict-deletion tests, and 3 reservation-overlap tests
proving the DB-level EXCLUDE constraint actually rejects concurrent-slot double-booking and rejects
startAt >= endAt. Full `install/format:check/lint/typecheck/test/build` gate passed against the real DB
(also fixed a real bug found during this: Turborepo v2's default strict env mode was silently stripping
DATABASE_URL/SESSION_SECRET from task subprocesses — added `globalEnv` to turbo.json and made `test`
uncached, verified by rerunning after the fix).
Security/tenant checks: every tenant-owned table has a required, indexed `salonId`; Reservation FKs are
Restrict (never orphaned by deleting a salon/service/employee/customer); AuditLog has no FK at all so it
outlives what it describes; overlap-prevention is DB-enforced, not just application logic.
Risks: (1) AuditLog/ReservationStatusHistory immutability is an application-layer contract only — the
app's DB role still has UPDATE/DELETE grants at the Postgres level; revoking those explicitly would be a
stronger guarantee, worth doing before Phase 12. (2) No down-migration scripts exist, only documented
manual rollback steps in SQL comments — acceptable pre-production, must be revisited once real data
exists. (3) Postgres is running via Postgres.app on this machine, started manually this session — it is
not managed by any process supervisor here, so it needs to be started again (`pg_ctl -D ~/Library/
Application\ Support/Postgres/var-18 start`) if this machine restarts.
Next: Section 9 — Authentication

## Section 9 — Authentication

Status: done. Docs: docs/security/authentication.md (registration/login/logout/session/forgot-reset/
invitation-accept/suspended-users/CSRF/rate-limits/safe-redirects specified), ADR-0003 finalized with
concrete library choices (Passport local strategy, argon2id, express-session, connect-pg-simple,
custom double-submit CSRF, @nestjs/throttler). Two new Prisma models (PasswordResetToken,
SalonInvitation, migration `20260805205231_auth_tokens`). Backend: apps/api/src/auth/* (AuthService,
PasswordService, TokenService, LocalStrategy, SessionSerializer, CsrfGuard, AuthenticatedGuard,
ZodBodyGuard, AuthController with register/login/logout/me/forgot-password/reset-password/
invitations/accept). UI: apps/web (login, register, forgot-password, reset-password, account —
session-expired redirect with returnTo preserved) and apps/dashboard (login, invitations/accept),
using the Section 7 design system throughout; shared `isSafeRedirectPath` validator in
packages/validation/src/auth.ts.
Commit: pending (this task)
Tests: 15 backend tests (11 new integration tests via Supertest + a real Nest app + real Postgres:
register/duplicate-email/mass-assignment/wrong-password/nonexistent-email/suspended-account/CSRF
missing-header/CSRF mismatched-header/CSRF valid/forgot-password enumeration-resistance/reset-password
invalid-token), 7 new shared Zod schema tests. Full repo gate (install/format/lint/typecheck/test/
build, 11/11 tasks) passed. Playwright auth-journey specs written (e2e/auth-journeys.spec.ts) but not
executed — browsers still not installed in this environment.
Two real, previously-undetected bugs found and fixed via actual runtime verification (not just
compiled/tested in isolation):

1. **Shared packages were never actually buildable for a real Node runtime.** `packages/validation`,
   `packages/auth`, `packages/contracts`, `packages/database` all had `package.json#main` pointing
   directly at `.ts` source with no real `build` script (only `tsc --noEmit`). This worked for Next.js
   (webpack/turbopack bundles workspace TS source) and for Vitest (esbuild/swc transform on the fly),
   but `node dist/main.js` — the actual production runtime — crashed with
   `ERR_MODULE_NOT_FOUND`/`ERR_UNSUPPORTED_DIR_IMPORT` under Node 24's native TypeScript handling.
   This had been silently true since Section 6 and was only caught now because this phase's work
   prompted an actual `node dist/main.js` smoke test rather than stopping at `nest build` (which only
   type-checks/transpiles apps/api's own source, not its workspace dependencies). Fixed: all four
   packages now have a real `build` script emitting CommonJS to `dist/`, and `main`/`types` point
   there. Also discovered and killed two orphaned `nest start --watch` background processes left over
   from this session that were interfering with re-runs.
2. **Login never established a session.** `AuthGuard('local')` runs `LocalStrategy.validate` but does
   _not_ itself call `req.login()` (unlike what its own inline comment assumed) — `POST /auth/login`
   returned 200 with correct user data while creating zero session, so every subsequent request was
   unauthenticated. Only found via an actual browser walkthrough (register → logout → login → hit
   `/account` again) after `curl` comparison against a working `/auth/register` call showed
   `Set-Cookie` was present on register but absent on login. Fixed by calling `req.login()` explicitly
   in the login handler, same as register/accept-invitation already did. Added a regression assertion
   (`GET /auth/me` must return 200 immediately after login, not just after suspension) that would have
   caught this the first time.
   Security/tenant checks: enumeration resistance verified for login and forgot-password (identical
   responses); CSRF double-submit verified to actually reject missing/mismatched tokens, not just accept
   valid ones; suspended-account check re-verified per-request, not cached in session.
   Risks: (1) email delivery for password reset/invitations is not implemented (out of MVP scope per
   docs/product/out-of-scope.md — no notification provider yet); tokens are created but never sent
   anywhere. (2) Rate limiting (@nestjs/throttler) is wired but not explicitly load-tested in this phase.
   (3) `nest start --watch` (the `pnpm dev` convenience script) is broken under this environment's Node
   24 due to the same native-TS/ESM quirk noted above in a different form — `pnpm build && node dist/
main.js` works and is what CI/production actually run, so this is a dev-ergonomics gap, not a
   correctness one; not fixed this session (out of scope for auth, tracked here for whoever picks up
   Section 10+).
   Next: Section 10 — Authorization and Tenant Isolation

## Section 10 — Authorization and Tenant Isolation

Status: done. Docs: docs/security/authorization.md (deny-by-default guard order, effective-role
resolution, 404-not-403 denial policy, per-role policy table, test matrix). Implementation:
apps/api/src/authz/{roles.decorator,roles.guard,salon-context,authz.module}.ts. `RolesGuard`
resolves the caller's role for `:salonId` in the route (SUPERADMIN bypass — audited every time via
`AuditLog` action `superadmin.context_entry` — or an active `SalonMembership` row looked up by
`(userId, salonId)`, never trusting body/query-supplied values), attaches `SalonContext` via
`@CurrentSalonContext()`, and denies with `404` (not `403`) by default, including when a route forgets
`@Roles(...)` entirely (fails closed rather than allowing any authenticated caller through).
`packages/database` now also exports the `SalonRole` enum; `packages/auth`'s `Role` type is the shared
vocabulary. No business CRUD routes were added, per this phase's scope.
Commit: pending (this task)
Tests: 10 new integration tests (apps/api/src/authz/roles.guard.e2e.test.ts) against a real Nest app +
real Postgres, using a throwaway test-only controller to exercise the guard through the actual HTTP
pipeline rather than a hand-mocked ExecutionContext: unauthenticated→401, misconfigured route (no
`@Roles()`)→404, no membership/guessed salon ID→404, right salon/wrong role→404 then right
role→200, suspended membership→404, cross-salon membership→404, SUPERADMIN bypass→200 + audit row
verified, SUPERADMIN denied on a non-SUPERADMIN route, CUSTOMER-only route allows any authenticated
user (ownership is the handler's job), forged `salonId` in the request body ignored (route param wins).
Full repo gate (12/12 tasks: format/lint/typecheck/test/build) passed against the real DB; compiled
`node dist/main.js` smoke-tested again (learned from Section 9 not to trust `nest build` alone) and
starts cleanly with `AuthzModule` wired in.
Security/tenant checks: verified the guard is genuinely DB-backed (not a client-trust shortcut) via
the cross-salon and forged-salonId tests; verified SUPERADMIN bypass is per-route, not global; verified
fail-closed behavior on a misconfigured route.
Audit performed inline by main agent (Sonnet) against the Prompt 10.3 checklist — this environment's
Agent tool cannot invoke the custom `security-reviewer`/`test-engineer` subagent definitions, consistent
with prior sections.
Risks: (1) "changed customer ID" / ownership-based denial is documented (docs/security/authorization.md
§ CUSTOMER routes) but not yet tested end-to-end, because no CUSTOMER-owned resource (e.g. Reservation)
has CRUD routes yet — the pattern (`where: { id, customerId: req.user.id }`) is specified but only
provable once Phase 8's reservation engine or an earlier customer-profile route exists; add that test
alongside the first such route. (2) Rate limiting on the new authz-guarded paths inherits the global
throttler default (120/min) since no business routes exist yet to give stricter limits to.
Next: Section 11 — Superadmin (build in small slices)

## Section 11.1 — Superadmin: salon list and detail (read-only)

Status: done. First of five Section-11 slices (create/edit/suspend-restore/domain come next, each its
own commit). Extended `RolesGuard` to support platform-level SUPERADMIN routes (no `:salonId` in the
path, e.g. listing all salons) — audits as `superadmin.platform_action` vs. the existing per-salon
`superadmin.context_entry`. New: `packages/validation/src/salons.ts` (`listSalonsQuerySchema` — page/
pageSize/search/status, `.strict()` rejects unknown params), `apps/api/src/salons/*`
(SalonsController/Service — `GET /salons` paginated+searchable+status-filterable list,
`GET /salons/:salonId` detail with active-membership count, both SUPERADMIN-only, both 404 on denial
per docs/security/authorization.md). UI: `apps/dashboard/app/superadmin/salons/{page.tsx,[salonId]/
page.tsx}` — search/status filter, desktop Table + MobileRecordList, Pagination, loading/empty/error/
permission-denied states; dashboard home now links to it when `isSuperadmin`. No create/edit/delete —
explicitly out of scope for this slice.
Commit: pending (this task)
Tests: 7 new backend integration tests (unauthenticated→401, non-superadmin→404 on both list and
detail, pagination/search/status-filter correctness, unknown-query-param/oversized-pageSize→400,
malformed-ID/nonexistent-ID→404 with identical response shape, platform_action and context_entry audit
rows verified). Full repo gate (12/12) passed; compiled `node dist/main.js` + real `next dev` dashboard
both smoke-tested; full browser walkthrough as a seeded superadmin (login → salon list with 7 real
Postgres rows → detail page with correct active-staff count).
One real bug found and fixed via the browser walkthrough (not caught by any automated test): the
salon-detail page's `<dt>`/`<dd>` pair for `Slug` used `flex justify-between` with no gap — for a slug
long enough that label+value together exceeded the card width, flexbox had zero space left to
distribute and the label ran directly into the value with no visible separation. Fixed with
`flex-wrap` + `gap-x-3` + `shrink-0` on the label + `break-all` on the value; verified visually after
the fix. This is the kind of "long content" case docs/design/responsive-strategy.md calls out, but no
existing automated test would have caught a CSS-only spacing collapse — worth a note for future UI
work that pairs a fixed label with an unbounded-length value.
Security/tenant checks: detail endpoint returns byte-identical 404s for "wrong role" / "malformed ID" /
"nonexistent ID" (no existence leakage); list/detail both audited; unknown query params rejected
outright rather than silently ignored (mass-assignment-style guard on read paths too).
Risks: (1) `SalonListItem`/`SalonDetail` response shapes are hand-duplicated as TS interfaces in both
the NestJS service and the two dashboard pages — `packages/contracts` was created for exactly this and
is still just a placeholder; worth moving these shared shapes there once a second consumer needs them,
not urgent with one caller each right now. (2) No E2E test executed (Playwright browsers still not
installed) — `e2e/superadmin-salons.spec.ts` written but unverified by Playwright itself (browser
walkthrough above used the Claude Browser tool directly instead).
Next: Section 11.2 — Superadmin: create salon + initial SALON_ADMIN invitation

## Section 11.2 — Superadmin: create salon + initial SALON_ADMIN invitation

Status: done. `packages/validation/src/salons.ts` → `createSalonSchema` (`.strict()`, rejects unknown/
protected fields like `status`/`id`/`subdomain`; slug is optional and normalized to lowercase; adminEmail
required). `SalonsService.create()`: validates timezone against `Intl.supportedValuesOf('timeZone')`
(+ explicit `'UTC'` — see bug below), derives slug from name when omitted, 409s on slug conflict,
creates Salon + default BookingPolicy + a SalonInvitation (role SALON_ADMIN, 7-day TTL, reusing
Section 9's TokenService) inside one transaction, records `salon.created` audit event. Returns the raw
invitation token once (no email provider exists — docs/security/authentication.md), for the SUPERADMIN
to relay manually. UI: `apps/dashboard/app/superadmin/salons/new/page.tsx` — responsive form, submit
disabled while in flight (duplicate-submit protection) backed by the DB-level slug unique constraint
as the real guarantee, confirmation screen showing the copyable invite link + expiry. Extended
`RolesGuard`'s existing platform-level-SUPERADMIN branch (added in 11.1) to also cover this POST.
Commit: pending (this task)
Tests: 8 new backend integration tests: unauthenticated→401 (CSRF-primed, see bug below),
non-superadmin→404, full success path (booking policy + invitation + audit row all verified against
real Postgres), slug derivation + normalization, duplicate-slug→409, invalid-timezone→400,
missing-required-field→400, forbidden-field-injection→400. Full repo gate (12/12) passed; compiled
`node dist/main.js` + real dashboard `next dev` both smoke-tested; full browser walkthrough as the
seeded superadmin (fill form → submit → confirmation with real invite link) followed by a curl-driven
verification that the _actual_ token from that _actual_ invitation really works end-to-end (accepted →
new User created → SalonMembership(SALON_ADMIN) row created) — not a synthetic test double.
Two real bugs found and fixed, both by actually running the thing rather than trusting the first green
test run:

1. `Intl.supportedValuesOf('timeZone')` does not include plain `'UTC'` — ICU's canonical form is
   `'Etc/UTC'`. Since `'UTC'` is a completely standard identifier already used throughout this
   project's own seed data and tests, rejecting it would have been a real product bug for the first
   salon anyone tried to create. Fixed by adding `'UTC'` to the accepted set explicitly.
2. The "rejects an unauthenticated request" test itself was wrong: it POSTed with no CSRF handshake
   at all and expected `401`, but the global `CsrfGuard` runs before any controller-level guard, so an
   unauthenticated + CSRF-less request correctly gets `403` first. Fixed the test to prime CSRF (as a
   real browser would) so it actually exercises `AuthenticatedGuard`'s `401`, not `CsrfGuard`'s `403`.
   Also hit and fixed a test-infrastructure issue unrelated to this feature's logic: the global
   `AUTH_THROTTLE` (10 registrations/60s, shared across all `apps/api` test files in one process) started
   rejecting legitimate test registrations once enough test files accumulated Section 9/10/11 auth calls
   in the same 60-second window. Made the limit `AUTH_THROTTLE_LIMIT` env-overridable (production default
   unchanged at 10) and set it in `apps/api`'s own `test` script so `pnpm test` works without a special
   invocation — this is a real scaling concern for future phases too (more test files, same shared bucket).
   Security/tenant checks: mass-assignment rejected at the schema layer before the service ever runs;
   slug/timezone/adminEmail all server-validated; invitation token only ever appears in the one API
   response that creates it, never logged, never re-returned by any other endpoint.
   Risks: (1) `AUTH_THROTTLE_LIMIT` env-override strategy should be revisited once there are enough auth
   test files that even 1000/60s in one process feels fragile — a per-test-file fresh Nest app with
   isolated throttler storage would be the more scalable fix, not attempted here (would touch every
   existing test file). (2) Invitation email delivery is still just a manually-copied link — unchanged
   known gap from Section 9, now with a second call site.
   Next: Section 11.3 — Superadmin: edit salon (allowlisted fields)

## Section 11.3 — Superadmin: edit salon (allowlisted fields) + 11.4 — Suspend/restore

Status: done (both slices, one commit — implemented together since 11.4's suspend effect required
extending the same `RolesGuard` branch 11.3's tests exercise). `updateSalonSchema` (packages/
validation): explicit field-by-field allowlist (name/timezone/city/description/addressLine/phone/
email/genderFocus), `.strict()` rejects slug/subdomain/status/id, `nullable()` lets a field be
explicitly cleared, requires at least one real field beyond the optional `expectedUpdatedAt`
concurrency token. `salonLifecycleActionSchema`: optional `reason` only — which action (suspend vs.
restore) is decided by the route, never a client-supplied status. `SalonsService.update()`: 404 if
missing, 409 if `expectedUpdatedAt` doesn't match the current row (optimistic concurrency — a real
stale-write guard, not just UI-level), re-validates timezone if provided, builds the Prisma `data`
object field-by-field from the allowlist (never spreads the body), audits `salon.updated` with the
list of changed field _names_ only (not values, keeping audit metadata small per docs/security/
security-requirements.md). `suspend()`/`restore()` share one `setStatus()` helper, audit
`salon.suspended`/`salon.restored` with the optional reason.
**11.4's suspend effect implemented for real, not just documented**: extended `RolesGuard`'s
membership-lookup branch to also require `membership.salon.status === 'ACTIVE'` — a suspended salon's
own SALON_ADMIN/SALON_MANAGER staff are denied (404) immediately, while SUPERADMIN's bypass branch
(evaluated earlier, unaffected) can still enter a suspended salon to restore it. Public-visibility and
new/existing-reservation effects remain documented-only (no public browsing or reservation engine
exists yet to enforce them against) — noted as risk below for whoever builds those.
UI: `apps/dashboard/app/superadmin/salons/[salonId]/edit/page.tsx` (pre-filled form, sends
`expectedUpdatedAt` from the just-fetched detail, surfaces the 409 as "someone else changed this,
reload" rather than a generic error) and a Suspend/Restore button + `ConfirmDialog` (explicit
confirmation, per CLAUDE.md's destructive-action rule) added to the existing detail page.
Commit: pending (this task)
Tests: 8 new update tests + 5 new suspend/restore tests in salons.e2e.test.ts (cross-role denial,
successful update preserves untouched fields, explicit-null clears a field, empty-body/forbidden-field
→400, stale `expectedUpdatedAt`→409, nonexistent salon→404 on all three actions, suspend/restore audit
rows with reason verified) + 2 new RolesGuard tests (suspended salon blocks its own active-membership
staff; SUPERADMIN still gets into a suspended salon). Full repo gate (12/12) passed. Full browser
walkthrough as the seeded superadmin against the real running stack: opened a real salon, suspended it
(confirm dialog → toast → badge flips to SUSPENDED → button flips to Restore), restored it, then edited
its city field and confirmed the change persisted through a page reload — all against real Postgres,
not mocked.
Security/tenant checks: allowlist enforced at both the schema layer (`.strict()`) and the service layer
(field-by-field copy, no spread); optimistic concurrency prevents a lost-update race between two admins
editing the same salon; suspend/restore audited with actor + reason; suspended-salon access denial
verified through the real HTTP+guard pipeline, not just at the unit level.
Risks: (1) Public-visibility and reservation-blocking suspend effects are documented in
docs/security/authorization.md / this entry but not enforceable yet — no public salon browsing or
reservation engine exists. Whoever builds those must filter/check `salon.status === 'ACTIVE'`
explicitly; nothing currently does that automatically for them. (2) `expectedUpdatedAt` concurrency
check compares millisecond timestamps — fine given Prisma's `@db.Timestamptz(3)` precision, but worth
remembering if the column precision ever changes. (3) No decision yet on whether suspending a salon
should also force-expire its staff's live sessions (currently they'd just get 404s on next request via
RolesGuard, which is sufficient, but the session itself stays technically valid) — matches the same
accepted trade-off already noted for suspended _users_ in Section 9.
Next: Section 11.5 — Superadmin: domain/subdomain management (deferred — see below)

## Section 12.1 — Salon Admin: employee list and detail (read-only)

Status: done. Section 11.5 (superadmin domain/subdomain management) deferred at the user's explicit
request in favor of moving to Section 12 — not implemented, remains open. This is the first
SALON_ADMIN-scoped (not platform/SUPERADMIN-only) route built on top of `RolesGuard`.
`packages/validation/src/employees.ts` → `listEmployeesQuerySchema` (page/pageSize/search/
isActive — coerced from string 'true'/'false' since it travels as a query param). Backend:
`apps/api/src/employees/*` — `EmployeesController` at `salons/:salonId/employees`, `@Roles('SUPERADMIN',
'SALON_ADMIN')` (SALON_MANAGER and plain users denied per the prompt's explicit spec). Handlers read
the authorized salonId from `@CurrentSalonContext()` (the guard-resolved value), never from the raw
route param directly, matching the documented pattern in `salon-context.ts`. `list()` scopes every
query by that salonId; `detail()` combines `id` + `salonId` in one `findFirst` (not fetch-then-check),
so an employee ID from a different salon 404s identically to a nonexistent one. UI:
`apps/dashboard/app/salon/[salonId]/employees/{page.tsx,[employeeId]/page.tsx}` — same search/filter/
Table/MobileRecordList/Pagination pattern as the superadmin salons list, reusing the design system.
Commit: pending (this task)
Tests: 8 new integration tests: unauthenticated→401, SALON_MANAGER and no-membership user→404 on both
list and detail, SALON_ADMIN and SUPERADMIN both succeed with correct search/isActive-filter/pagination,
**cross-salon leakage test** (an admin of salon A gets an empty-filtered result for salon A and an
outright 404 for salon B, never a mixed/leaked list), **IDOR test** (a valid SALON_ADMIN of salon A
requesting a real employee ID that belongs to salon B still 404s — the salonId is in the query, not
checked after fetching), malformed/nonexistent employee ID→404. Full repo gate (12/12) passed. Full
browser walkthrough: seeded a real salon + SALON_ADMIN + two employees (one active, one inactive) via
Prisma, logged in as that SALON_ADMIN in-browser (after logging out of the superadmin session used in
prior sections — cookies are shared across dashboard sessions on `localhost` regardless of port), and
verified the list (both employees, correct badges) and detail page render real data.
Security/tenant checks: this is the first route where the resolved `SalonContext.salonId` (not the raw
`:salonId` route param) is what handlers actually use — verified via the cross-salon and IDOR tests
that this is not just cosmetic, it's the thing preventing leakage. No sensitive fields are exposed
(`EmployeeProfile` has none beyond what's already documented as public in data-classification.md).
Risks: (1) No SALON_ADMIN dashboard landing/navigation exists yet — this route is only reachable by
direct URL today; a "my salon" landing page is naturally Prompt 12.2+'s or a later phase's job, not
attempted here to keep this slice's diff focused on the read flow itself. (2) Section 11.5 (domain/
subdomain management) remains unimplemented — deferred, not forgotten; still needed before any public
subdomain-based salon resolution work in later phases.
Next: Section 12.2 — Salon Admin: employee create/edit/status

## Section 12.2 — Salon Admin: employee create/edit/status

Status: done. `packages/validation/src/employees.ts` → `createEmployeeSchema` (fullName required,
bio optional, `.strict()` — salonId/id/isActive/photoUrl all rejected; photoUrl deliberately reserved
for 12.3's signed-upload flow) and `updateEmployeeSchema` (all fields optional, explicit-null clears
bio, `expectedUpdatedAt` for optimistic concurrency, `.strict()` + refine to reject an empty body).
Backend: `EmployeesService.create/update/setActive` — `update()` compares `expectedUpdatedAt` against
the current row's `updatedAt` and throws 409 on mismatch before writing; both `update()` and
`setActive()` re-scope the actual `.update()` where-clause by `id` + `salonId` even though ownership
was already proven by the preceding `findFirst`, so a future refactor bug can't turn this into a
cross-salon write. Every write builds its Prisma `data` object field-by-field from a fixed allowlist
(never a spread of the raw body) and audits via `AuditService` (`employee.created`, `employee.updated`
with `changedFields` metadata, `employee.activated`/`employee.deactivated`). Controller adds
`POST /`, `PATCH /:employeeId`, `POST /:employeeId/activate`, `POST /:employeeId/deactivate`, all
`@Roles('SUPERADMIN','SALON_ADMIN')`, all reading `salonId`/`userId` from `@CurrentSalonContext()`/
`@CurrentUser()`. UI: new-employee form, edit form (sends `expectedUpdatedAt`, surfaces 409 as a
friendly "changed by someone else" message), and detail page gains Edit link + Activate/Deactivate
button behind `ConfirmDialog` (destructive styling when deactivating).
Commit: pending (this task)
Tests: 11 new integration tests (SALON_MANAGER denied on create/update/activate/deactivate; successful
create + audit; missing/forbidden fields on create→400; cross-salon create denied; successful update
preserves untouched fields + audit changedFields; stale `expectedUpdatedAt`→409; cross-salon employee
PATCH→404 with row left untouched; deactivate-then-activate with both audit rows verified; cross-salon
activate/deactivate→404). Also fixed a stale exact-shape assertion in a 12.1 test that didn't account
for `updatedAt` now being in the detail select. `apps/api` total: 71 passing tests. 12 new schema tests
in `packages/validation` (37 total in that package). Full repo gate (12/12) passed.
Browser walkthrough: created a real employee ("Nigar Aliyeva") via the live form as a seeded
SALON_ADMIN, confirmed redirect to its detail page with correct name/bio/Active badge; edited the name
via the live edit form, confirmed the toast and the updated name on the detail page; opened the
Deactivate `ConfirmDialog`, confirmed its destructive copy, confirmed, and verified the badge flipped
to "Inactive" with the button relabeling to "Activate".
Security/tenant checks: concurrency check and both write paths re-verify `salonId` at the actual
`.update()` call, not just at the ownership pre-check; `.strict()` schemas block `isActive`/`salonId`/
`id`/`photoUrl` from ever reaching the service via create/update bodies — activation state can only
change through the dedicated activate/deactivate routes, which are separately role-gated and audited.
Risks: none new. Section 11.5 (domain/subdomain management) remains deferred. Section 12.3 (employee
portfolio/photo uploads) will need a signed-upload storage decision (ADR) before implementation.
Next: Section 12.3 — Salon Admin: employee portfolio/photo uploads (pending storage ADR)

## Section 12.3 — Salon Admin: employee portfolio and uploads

Status: done. Wrote ADR-0008 (`docs/adr/0008-file-storage.md`) first: a pluggable `StorageAdapter`
interface (`packages/storage`) with an `s3` driver (real S3-compatible presigned uploads, for
production) and a `local` driver (HMAC-signed short-lived upload/download tokens served through the
API itself, since this environment has no Docker/S3 credentials — same pragmatic-substitute pattern
already used for sessions in ADR-0003). `STORAGE_DRIVER` env var selects the driver, defaulting to
`local`; both fail closed if required env vars are missing.
Backend: `apps/api/src/storage/*` (DI wiring, `STORAGE_ADAPTER`/`LOCAL_DISK_ADAPTER` tokens),
`apps/api/src/uploads/*` (the local driver's serving route — `PUT/GET /uploads/:token` — 404s
uniformly on any bad/expired/wrong-purpose token, no oracle), `apps/api/src/employees/portfolio/*`
(`PortfolioService`/`PortfolioController` under `salons/:salonId/employees/:employeeId/portfolio`).
Flow: `POST .../upload-url` validates MIME allowlist (jpeg/png/webp only, no SVG/executable per the
prompt's explicit requirement) and size limit (5MB) and returns a signed target with a random
server-generated object key (`employees/:employeeId/:uuid.ext`); the client PUTs bytes directly to
that URL; `POST .../portfolio` (confirm) re-verifies the objectKey belongs to this employee's
namespace, stats the object (size re-checked server-side — closes the gap where a presigned S3 PUT
can't enforce size itself), and sniffs the first 12 bytes against real image magic numbers
(`detectImageMime`) rather than trusting the claimed Content-Type — rejects and deletes the object if
it isn't a real image. `imageUrl` in the DB stores the object key, not a URL; every read re-resolves a
fresh (possibly short-lived signed) URL via the adapter, so nothing long-lived leaks. Ordering via
`POST .../reorder` (transactional, rejects any payload that isn't exactly the current item-id set).
Deletion is role-gated (SALON_ADMIN/SUPERADMIN only) and tenant/ownership-chained (`id` + `employeeId`
in one query); storage-delete failure is best-effort and never blocks the DB delete succeeding.
`caption` doubles as the accessible alt text (one text field on the approved data model, not two).
UI: `apps/dashboard/.../portfolio-gallery.tsx` — upload button, responsive grid gallery, inline caption
edit, move-earlier/move-later `IconButton`s (keyboard-accessible ordering without a drag-drop library),
delete behind `ConfirmDialog`. Added `apps/dashboard/lib/api-client.ts`'s `putFile()` for the raw signed
upload (bypasses the JSON-only `apiFetch` assumptions but still attaches the CSRF header, since it's a
state-changing request in the same session).
Commit: pending (this task)
Tests: 30 new — `packages/storage` (20: magic-byte detection incl. spoofed-SVG/executable rejection,
HMAC token round-trip/tamper/expiry/wrong-secret, local-disk path-traversal rejection, size-limit
enforcement with partial-file cleanup) + `packages/validation` (14 portfolio schema tests) + `apps/api`
(15 new e2e: role denial, MIME/size rejection, full upload→confirm→list round trip with a real PNG,
reject-never-uploaded, reject-wrong-employee-namespace, reject-fake-image-content, cross-salon 404 on
every route, caption edit + audit, cross-employee 404 on edit, reorder + audit, reorder-with-missing-
item→400, delete + audit + storage cleanup, SALON_MANAGER denied on delete, cross-employee 404 on
delete). `apps/api` total: 86 passing tests. Full repo gate (14/14 lint+typecheck+test) passed on the
new `packages/storage` workspace plus all existing ones.
Browser walkthrough: uploaded a real PNG through the actual HTTP upload-url/PUT/confirm flow (the
in-app browser tool has no native file-picker control, so this was driven via curl using the same
authenticated session cookie the browser held — the browser then rendered the result), confirmed the
image renders via its signed local-storage URL with the caption shown; edited the caption inline and
confirmed it persisted; opened the delete `ConfirmDialog` and confirmed. **Found and fixed a real bug
this way**: `apiFetch` unconditionally called `res.json()` on any ok response, which threw on the
portfolio delete's `204 No Content` (the first 204 endpoint in the app) — the delete had actually
succeeded server-side every time, but the frontend showed a false "Could not remove photo" error.
Fixed by short-circuiting on `res.status === 204`. Also fixed `turbo.json`'s `globalEnv` allowlist,
which was silently stripping the new `STORAGE_DRIVER`/`LOCAL_STORAGE_*`/`S3_*` env vars from turbo-
orchestrated task runs (direct `pnpm --filter` runs were unaffected, which is why this wasn't caught
until the full `pnpm test`/`pnpm build` gate).
Security/tenant checks: every portfolio route re-derives salonId from `SalonContext`, not the raw
route param; objectKey ownership is checked against the employee's namespace before confirm; actual
file bytes are verified against an allowlist independent of client-supplied Content-Type; local-disk
object keys are regex- and path-resolution-checked to reject traversal even though only server-
generated keys are ever used; the local upload/download serving route 404s uniformly regardless of
which part of a token is wrong (no distinguishing oracle).
Risks: (1) No cleanup job exists for storage objects whose upload-url was requested but never
confirmed (orphaned objects) — acceptable for now, a background sweep can be added later without any
API contract change. (2) Section 11.5 (domain/subdomain management) remains deferred.
Next: Section 13 — Salon Admin: Services (service categories)

## Section 13.1 — Salon Admin: service categories

Status: done. Schema gap found and fixed first: the approved `ServiceCategory` model (Section 8) had
`name`/`sortOrder` but no `isActive` field, even though Prompt 13.1 explicitly requires validating
"active state". Added `isActive Boolean @default(true)` via an additive, reversible migration
(`20260806094511_add_service_category_is_active`) — applied directly and marked resolved with `prisma
migrate resolve --applied` rather than through `migrate dev`, since the dev database had unrelated,
expected drift (the runtime-created `session` table isn't Prisma-managed) that would otherwise have
forced a full destructive reset. `slug` was deliberately not added — the prompt says "slug if used" and
nothing in the app uses category slugs yet, so adding it now would be speculative.
`packages/validation/src/service-categories.ts` → `createServiceCategorySchema` (name only, `.strict()`
— salonId/id/isActive/sortOrder all rejected, matching the employee-profile pattern of keeping
lifecycle state off the create/update surface), `updateServiceCategorySchema` (name + optional
`expectedUpdatedAt`), `reorderServiceCategoriesSchema`. Backend: `apps/api/src/service-categories/*` at
`salons/:salonId/service-categories`, `@Roles('SUPERADMIN','SALON_ADMIN')` per method (SALON_MANAGER
denied). Routes: list (no pagination — categories are a small, fully-loaded set), detail, create,
update (optimistic concurrency via `expectedUpdatedAt`, same pattern as employees), activate/deactivate
as dedicated audited actions (not folded into update), and a transactional reorder endpoint (rejects any
payload that isn't exactly the salon's current category-id set — same pattern as the portfolio
reorder). Uniqueness (`@@unique([salonId, name])`) is pre-checked with a friendly 409 before insert/
update, matching the existing slug-uniqueness pattern in `salons.service.ts`, and re-checked on rename
only when the name actually changes.
Commit: pending (this task)
Tests: 20 new e2e tests — unauthenticated→401, SALON_MANAGER/no-membership→404 on every route, cross-
salon list returns `[]` (never another salon's rows), create + audit, missing-name/forbidden-fields→400,
duplicate name→409, same name allowed across two different salons, cross-salon create denied, edit +
audit, rename-to-duplicate→409, stale `expectedUpdatedAt`→409, cross-salon edit→404 with row untouched,
activate/deactivate + both audit rows, cross-salon lifecycle→404, reorder + audit, reorder with a
missing category→400, reorder denied for SALON_MANAGER. 10 new schema tests in `packages/validation`.
`apps/api` total: 106 passing tests (61 in `packages/validation`). Full repo gate (14/14) passed.
UI: `apps/dashboard/app/salon/[salonId]/service-categories/{page.tsx,new/page.tsx,
[categoryId]/edit/page.tsx}` — flat list (no pagination, matching the small-set assumption) with
inline move-earlier/move-later `IconButton`s and an activate/deactivate `Button` per row, a create
form, and an edit form using the same `expectedUpdatedAt` concurrency pattern as employees.
Browser walkthrough: created "Hair" then "Nails" as a seeded SALON_ADMIN, confirmed correct initial
order; moved "Nails" earlier and confirmed the swap persisted; renamed it to "Nails & Spa" via the edit
form and confirmed the list reflected it; deactivated "Nails & Spa" and confirmed the badge flipped to
"Inactive" with the button relabeling to "Activate".
Security/tenant checks: every route re-derives salonId from `SalonContext`; update/setActive/reorder
all re-scope the actual write by `id`/`categoryId` + `salonId`, not just at the ownership pre-check;
isActive is unreachable from create/update bodies (`.strict()` schemas), only settable through the
role-gated, audited activate/deactivate actions.
Risks: none new. Section 11.5 (domain/subdomain management) remains deferred.
Next: Section 13.2 — Salon Admin: Services (service CRUD)

## Section 13.2 — Salon Admin: services

Status: done. `packages/validation/src/services.ts` — money kept as `Int` minor-units + `currency`
string per docs/architecture/data-model.md ("never float"); `priceAmount` bounded `0..10,000,000`
(sanity cap, not a business rule); `currency` validated as a 3-letter uppercase ISO-4217-shaped code;
`durationMinutes` bounded `5..480`, `bufferMinutes` bounded `0..120` (Prompt 13.2's explicit "validate
duration and buffer boundaries" requirement). `isActive` excluded from create/update — same
allowlisted-write-surface pattern as employees/service-categories, with dedicated audited activate/
deactivate actions instead.
Backend: `apps/api/src/services/*` at `salons/:salonId/services`, `@Roles('SUPERADMIN','SALON_ADMIN')`
per method. List supports pagination + search + `isActive`/`categoryId` filters (services can be a much
larger set than categories, unlike 13.1's flat list). `categoryId` on create/update is verified to
belong to the same salon before being written (`assertCategoryBelongsToSalon`, 400 if not — a service
can never reference another salon's category, closing off a cross-tenant linkage vector) — `categoryId:
null` explicitly clears the assignment. Optimistic concurrency via `expectedUpdatedAt`, matching
employees/categories. No hard-delete route, consistent with ADR-0006 (soft delete via `isActive`
everywhere in this codebase).
Commit: pending (this task)
Tests: 18 new e2e tests — unauthenticated→401, SALON_MANAGER/no-membership→404, cross-salon list
returns empty, filter by isActive/categoryId/search, create + audit, create with a valid same-salon
categoryId, reject a categoryId from a different salon, reject missing/invalid fields (bad duration,
negative buffer, negative price) and forbidden fields (isActive/salonId mass-assignment), cross-salon
create denied, edit + audit with `changedFields`, stale `expectedUpdatedAt`→409, reject reassigning to
a cross-salon categoryId, cross-salon edit→404 with row untouched, activate/deactivate + both audit
rows, cross-salon lifecycle→404, SALON_MANAGER denied on lifecycle actions. 19 new schema tests in
`packages/validation` (money-is-integer, currency-shape, duration/buffer boundary tests included).
`apps/api` total: 124 passing tests (80 in `packages/validation`). Full repo gate (14/14) passed.
UI: `apps/dashboard/app/salon/[salonId]/services/{page.tsx,new/page.tsx,[serviceId]/page.tsx,
[serviceId]/edit/page.tsx}` — paginated/filterable list (name search, status filter, category filter
populated from the Section 13.1 categories endpoint), detail page, create/edit forms. Price is entered
as a decimal string in the form and converted to integer minor-units (`Math.round(price * 100)`) right
at the request boundary — the wire format and stored format are always the safe integer representation;
only the form input is a human-friendly decimal.
Browser walkthrough: created "Haircut" ($50.00/45min, category "Hair") as a seeded SALON_ADMIN,
confirmed the detail page and the list's resolved category name/formatted price/duration; edited the
price to $55.00 via the edit form and confirmed it persisted; deactivated it via the `ConfirmDialog` and
confirmed the badge flipped to "Inactive".
Security/tenant checks: every route re-derives salonId from `SalonContext`; update/setActive re-scope
the actual write by `id`+`salonId`; categoryId cross-tenant linkage is blocked at write time, not just
at read time; isActive is unreachable from create/update bodies.
Risks: none new. Section 11.5 (domain/subdomain management) remains deferred.
Next: Section 13.3 — Salon Admin: Employee-service assignment

## Section 13.3 — Salon Admin: employee-service assignment

Status: done. `packages/validation/src/employee-services.ts` → `assignEmployeeServiceSchema`
(`serviceId` only, `.strict()`). Backend: `apps/api/src/employees/services/*` nested at
`salons/:salonId/employees/:employeeId/services`, `@Roles('SUPERADMIN','SALON_ADMIN')` per method,
wired into `EmployeesModule` (same pattern as the portfolio submodule in Section 12.3).
`EmployeeService.assign()` re-derives both sides from the authorized salonId rather than trusting the
client-supplied `serviceId` on its own: it re-fetches the employee by `id`+`salonId` (404 if not found
or wrong salon), re-fetches the service by `id`+`salonId` (400 if not found/wrong salon — this is input
validation, not route authorization, so it's a 400 not a 404, matching the categoryId-on-service pattern
from 13.2), and enforces Prompt 13.3's "must be active" rule on **both** sides (400 if the employee is
inactive, 400 if the service is inactive) before ever touching `EmployeeService`. Duplicate assignment
is pre-checked for a friendly 409 (the DB's own `@@unique([employeeId, serviceId])` is the actual
backstop). `unassign()` re-verifies the employee belongs to the salon and the service belongs to the
salon before deleting, so this route can't be used to probe whether a given serviceId exists anywhere
in the system. Every write is audited on the employee (`employee_service.assigned` /
`employee_service.unassigned`, with the `serviceId` in metadata).
Commit: pending (this task)
Tests: 17 new e2e tests — unauthenticated→401, SALON_MANAGER/no-membership→404 on list/assign/unassign,
cross-salon employeeId→404 on list, list returns assigned service details, assign + audit, duplicate
assignment→409, assign an inactive service→400, assign to an inactive employee→400, cross-salon
serviceId on assign→400, cross-salon employeeId on assign→404, malformed serviceId→400, unassign +
audit, unassign a non-existent assignment→404, cross-salon serviceId on unassign→404, cross-salon
employeeId on unassign→404. 4 new schema tests in `packages/validation`. `apps/api` total: 141 passing
tests (84 in `packages/validation`). Full repo gate (14/14) passed.
UI: `apps/dashboard/.../employees/[employeeId]/service-assignment.tsx` — a small widget on the employee
detail page: a `Select` populated from the salon's active services (filtered to exclude already-
assigned ones) + an Assign button, a list of currently-assigned services, and an unassign `IconButton`
behind a `ConfirmDialog`.
Browser walkthrough: attempting to assign with the seeded employee still `Inactive` correctly showed no
services eligible to fail against (had to activate the employee first, confirming the active-employee
rule is real and not just a docstring); activated the employee and the previously-deactivated "Haircut"
service via the API, reloaded, assigned "Haircut" through the live dropdown, confirmed it appeared in
the assigned list and disappeared from the dropdown, then unassigned it via the `ConfirmDialog` and
confirmed it returned to "No services assigned yet."
Security/tenant checks: assignment can never link an employee and a service from different salons —
both sides are independently re-verified against the same authorized salonId; the unassign route is
existence-checked on the service+salon pairing before the assignment lookup, so it can't be used as a
service-ID oracle across salons.
Risks: none new. Section 11.5 (domain/subdomain management) remains deferred. This completes Section 13
(Salon Admin — Services) in full.
Next: Section 14 — Salon Admin: Scheduling (weekly working schedule, breaks, time off/closures)

## Section 14.1 — Salon Admin: weekly working schedule

Status: done. `packages/validation/src/working-schedule.ts` → `createWorkingScheduleSchema`
(`weekday` 0–6, `startMinuteOfDay`/`endMinuteOfDay` bounded to a single day, `.refine()` rejecting
reversed/zero-length intervals). Minute-of-day values are interpreted in the salon's local timezone per
the existing `WorkingSchedule` model comment (schema.prisma) — no separate timezone field needed since
the interpretation is fixed at the salon level, not per-entry.
Backend: `apps/api/src/employees/working-schedule/*` nested at
`salons/:salonId/employees/:employeeId/working-schedule`, `@Roles('SUPERADMIN','SALON_ADMIN')`,
list/create/delete only (no update — changing a block is delete-then-recreate, which keeps the
overlap-validation logic in one place and matches the "add/remove blocks" editor UX). `create()`
requires the employee to belong to the authorized salon _and_ be active (400 otherwise) and rejects any
new interval that overlaps an existing entry on the same weekday for that employee (half-open interval
overlap check: `newStart < existingEnd && existingStart < newEnd`, so touching-but-not-overlapping
intervals like 9:00–12:00 and 12:00–17:00 are allowed). `remove()` re-verifies the entry belongs to both
the employee and the salon before deleting.
Commit: pending (this task)
Tests: 16 new e2e tests — unauthenticated→401, SALON_MANAGER/no-membership→404, cross-salon
employeeId→404 on list, create + audit, reject reversed interval, reject out-of-range weekday/minute
values, reject overlapping interval same weekday, allow adjacent (touching) intervals, allow the same
interval on a different weekday, reject creating a schedule for an inactive employee, cross-salon create
denied, delete + audit, delete a nonexistent entry is unreachable (belongs-to-different-employee→404),
cross-salon employeeId on delete→404. 7 new schema tests in `packages/validation`. `apps/api` total: 157
passing tests (91 in `packages/validation`). Full repo gate (14/14) passed.
UI: `apps/dashboard/.../employees/[employeeId]/working-schedule.tsx` — a responsive weekly editor:
all 7 days listed with their current blocks as removable chips, plus a per-day `<input type="time">`
pair and an Add button. Wired onto the employee detail page below "Eligible services".
Browser walkthrough: added a Monday 09:00–17:00 block through the live time-input form, confirmed it
rendered as a chip on Monday only (verified via page-text extraction, since this session's browser tool
had a scroll/screenshot rendering glitch — worked around by reading DOM/page-text directly, which
reliably confirmed real app state throughout); removed the chip and confirmed Monday returned to
"No hours set."
Security/tenant checks: create/delete both re-derive the authorized salonId and re-check employee
ownership; the active-employee rule is enforced server-side (confirmed by a real 400 in both the e2e
test and an earlier manual browser attempt against a still-inactive seeded employee, not just asserted
in code).
Risks: (1) No update endpoint — editing a block requires delete + recreate; acceptable given the small
scope of "add/remove blocks" the prompt asks for. (2) Section 11.5 (domain/subdomain management)
remains deferred. (3) Section 14.2 (breaks) and 14.3 (time off/closures) are separate slices, not yet
started; the approved schema has no salon-wide closure model (only per-employee `TimeOff`), which will
need to be flagged as an open decision when 14.3 is reached rather than improvised.
Next: Section 14.2 — Salon Admin: breaks

## Section 14.2 — Salon Admin: breaks

Status: done. `packages/validation/src/breaks.ts` → `createBreakSchema`, same weekday/minute-of-day
shape and reversed-interval guard as `working-schedule.ts` — the approved `Break` model
(schema.prisma) supports recurring weekly breaks only, no date-specific break table, so that's the
full scope here (not improvised beyond what the schema supports).
Backend: `apps/api/src/employees/breaks/*` nested at
`salons/:salonId/employees/:employeeId/breaks`, `@Roles('SUPERADMIN','SALON_ADMIN')`, list/create/
delete (no update, same delete-then-recreate rationale as 14.1). `create()` enforces the prompt's "fit
the selected schedule rules": the break's interval must fall entirely within at least one existing
`WorkingSchedule` block for that employee on that weekday (`start >= ws.start && end <= ws.end`) — a
break can never exist outside hours the employee doesn't work at all, and is rejected outright if no
working-schedule block exists for that day yet. Also rejects breaks that overlap each other on the same
weekday (same half-open-interval check as 14.1's schedule-overlap logic), and requires the employee to
be active. `remove()` re-verifies the break belongs to both the employee and the salon.
Commit: pending (this task)
Tests: 16 new e2e tests — unauthenticated→401, SALON_MANAGER/no-membership→404, cross-salon
employeeId→404 on list, create + audit, reject a break with no working-schedule block that day, reject
a break extending past the working-schedule block, reject reversed interval, reject overlapping break
same weekday, allow adjacent (touching) breaks, reject creating a break for an inactive employee,
cross-salon create denied, delete + audit, cross-employee delete→404 with row untouched, cross-salon
employeeId on delete→404. 6 new schema tests in `packages/validation`. `apps/api` total: 173 passing
tests (97 in `packages/validation`). Full repo gate (14/14) passed.
UI: `apps/dashboard/.../employees/[employeeId]/breaks.tsx` — a single compact form (day `Select` +
start/end `<input type="time">` + Add button) plus a flat list of existing breaks across all days,
each labeled with its weekday and removable via an `IconButton`. Kept to one form rather than 14.1's
per-day layout since breaks are typically few — this is the "clear mobile editing UX" the prompt asks
for without duplicating the heavier 7-section editor.
Browser walkthrough: seeded a Monday 9:00–17:00 working-schedule block via the API (reusing the same
authenticated session the browser held), added a Monday 12:00–13:00 break through the live form,
confirmed it rendered as "Monday, 12:00–13:00" in the list (verified via page-text/DOM extraction — this
session's browser tool has an unrelated screenshot-rendering glitch, worked around the same way as in
14.1), then removed it and confirmed the list returned to "No breaks set." Also directly observed one
real click not registering on the submit button (no POST logged in the network trace) before a retry
succeeded — consistent with the click-flakiness already noted earlier in this session, not an app bug.
Security/tenant checks: create/delete both re-derive the authorized salonId and re-check employee
ownership; the schedule-fit and active-employee rules are enforced server-side, not just in the
schema (confirmed by real 400s in the e2e suite for both).
Risks: none new. Section 11.5 (domain/subdomain management) remains deferred. Section 14.3 (time off
and closures) still needs the salon-wide-closure schema gap flagged as an open decision before
implementation, not improvised.
Next: Section 14.3 — Salon Admin: time off and closures

## Section 14.3 — Salon Admin: employee time off (salon-wide closures deferred)

Status: done, scoped down deliberately. Prompt 14.3 asks for both "employee time off and salon closure
periods," but the approved data model only has a per-employee `TimeOff` table — no salon-wide closure
model exists, and adding one is a real schema/architecture decision (new table, cross-cutting effect on
every employee's availability, its own reservation-conflict policy), not a safe default to improvise.
Asked the user how to proceed; confirmed **employee time off only** for this slice, with salon-wide
closures recorded as a new open decision (`docs/product/open-decisions.md` #6) for its own future
ADR/milestone.
`packages/validation/src/time-off.ts` → `createTimeOffSchema`: absolute UTC `startAt`/`endAt` (matching
the `TimeOff` model, unlike the weekday/minute-of-day shape used for schedules/breaks), `.refine()`
rejecting `endAt <= startAt`, `reason` capped at 500 chars, and an `acknowledgeConflicts` flag (see
below).
Backend: `apps/api/src/employees/time-off/*` nested at
`salons/:salonId/employees/:employeeId/time-off`, `@Roles('SUPERADMIN','SALON_ADMIN')`, list/create/
delete. `create()` implements Prompt 14.3's core safety requirement literally: it never touches a
reservation. It first rejects overlap with the employee's _other_ time-off periods (409), then checks
for overlapping reservations still in an active status (PENDING/CONFIRMED/CHECKED_IN — terminal
statuses like CANCELLED_*/COMPLETED/NO_SHOW can never conflict). If any exist and the caller hasn't set
`acknowledgeConflicts`, the endpoint returns 409 with the conflicting reservations in the body **and
does not create the time-off row at all** — "surface conflicts for explicit admin action" means the
admin must see them and consciously resubmit with `acknowledgeConflicts: true` to proceed. Even after
that override, reservations are still never modified — actually cancelling one, if the admin decides
to, remains a separate action on the reservation itself (not yet built; reservation status transitions
are Section 15/19 territory). `remove()` re-verifies tenant/employee ownership before deleting.
Commit: pending (this task)
Tests: 15 new e2e tests — unauthenticated→401, SALON_MANAGER/no-membership→404, cross-salon
employeeId→404 on list, create with no conflicts + audit, reject endAt≤startAt, reject an
over-length reason, reject overlapping time-off for the same employee, **surface conflicting
reservations without creating the time-off row, verify the reservation is left untouched, then
successfully create via the explicit `acknowledgeConflicts` override and verify the reservation is
_still_ untouched afterward**, terminal-status reservations (cancelled) never count as conflicts,
cross-salon create denied, delete + audit, cross-employee delete→404 with row untouched, cross-salon
employeeId on delete→404. 7 new schema tests in `packages/validation`. `apps/api` total: 188 passing
tests (104 in `packages/validation`). Full repo gate (14/14) passed.
UI: `apps/dashboard/.../employees/[employeeId]/time-off.tsx` — a form (two `datetime-local` inputs +
optional reason), a list of existing periods, and a distinct conflict-review panel: when the API
returns 409 with conflicts, the form is not resubmitted automatically — the conflicting reservations
are rendered with an explicit "Add time off anyway" button that resends the same request with
`acknowledgeConflicts: true`. Extended `apps/dashboard/lib/api-client.ts`'s `ApiError` with a `body`
property so callers can read structured error payloads like `conflicts`, not just the message string.
Time inputs are collected in the admin's own browser-local time and converted directly to UTC — there
is no SALON_ADMIN-accessible endpoint to read the salon's own timezone today (`GET /salons/:salonId` is
SUPERADMIN-only per Section 11), so salon-local and admin-local are assumed to match; documented as a
known simplification rather than a silently-skipped requirement.
Browser walkthrough: added a Sept 1–3 vacation with a reason through the live form, confirmed it
rendered correctly; seeded a CONFIRMED reservation on Sept 15 via a direct DB script (same technique
used for prior sections' verification), attempted to add Sept 14–16 time off through the live form —
confirmed the API returned 409 with the conflicting reservation shown in a review panel and that **no**
time-off row was created; clicked "Add time off anyway," confirmed the time-off was created and the
reservation's status was still `CONFIRMED` afterward (queried directly); removed a time-off entry and
confirmed it disappeared from the list. Also hit the same click-registration flakiness noted in 14.2
(a `left_click` on the submit button not registering) and worked around it with a direct
`element.click()` call — confirmed to be a browser-tool quirk, not an app bug, since the exact same
request succeeded once actually dispatched.
Security/tenant checks: create/delete re-derive the authorized salonId and re-check employee ownership;
the conflict-detection query is scoped by both `salonId` and `employeeId` (never a bare employeeId
lookup); reservation status is never written by this code path under any circumstance, including the
explicit-override path — verified directly against the database, not just asserted in code.
Risks: (1) Salon-wide closures remain unimplemented — tracked as open decision #6, needs its own
ADR/schema change before a future milestone. (2) Time-off input assumes admin-local time equals
salon-local time (no salon-timezone read endpoint available to SALON_ADMIN); acceptable for MVP, worth
revisiting if salons and their admins end up in different timezones in practice. (3) Section 11.5
(domain/subdomain management) remains deferred. This completes Section 14 (Salon Admin — Scheduling)
for everything the current schema supports.
Next: Section 15 — Reservation Engine (backend-first; flagged in the playbook as the most critical
area, to be worked in separate focused sessions)

## Section 15.1 — Reservation state machine (documentation only)

Status: done. No endpoints implemented, per the prompt's explicit "do not implement endpoints"
constraint. Read the approved reservation specification
(`docs/Salonomia_Optimal_Customer_Reservation_Flow.md`), ADR-0005 (concurrency), the relevant schema
(`ReservationStatus` enum, `Reservation`, `ReservationStatusHistory`, `BookingPolicy` in
`schema.prisma`), and authorization policy (`docs/product/role-permission-matrix.md`,
`docs/security/authorization.md`). Wrote `docs/architecture/reservation-state-machine.md`: the full
transition table (from/to/actor/preconditions/side-effects/audit-event/notification-event), actor
permissions summary, an explicit illegal-transitions list, idempotency behavior (confirm/reject on an
already-transitioned reservation is a no-op success, not an error; double-submit creation is prevented
via an idempotency key — mechanism deferred to 15.3), and a restatement (not a change) of ADR-0005's
concurrency guarantee, clarifying which transitions need the full transactional re-check (creation,
reschedule — anything touching time/employee) versus a plain conditional `UPDATE` (confirm, reject,
cancel, check-in, complete, no-show).
Commit: pending (this task)
Tests: n/a (documentation only, as instructed). This document is the executable-as-tests spec that
15.3–15.5's implementation and 15.6's security review will be checked against.
Security/tenant checks: n/a at this stage — the point of this document is to make later reviews
mechanical: every transition row already states its precondition (including the salon/customer
ownership check) and which errors are illegal vs. idempotent, so 15.6 can audit against a written
contract instead of inferring intended behavior from code.
Risks: none new — this is a planning artifact. The real risk surface opens up starting 15.2
(availability engine) and 15.3 (booking transaction), which is why the playbook calls for separate
sessions per sub-prompt in this section.
Next: Section 15.2 — Availability engine (pure domain service, no UI, no reservation-creation endpoint)

## Section 15.2 — Availability engine (pure domain service)

Status: done. No UI, no reservation-creation endpoint, per the prompt's explicit scope — this is
callable domain logic only, to be wired up by Section 15.3's booking transaction.
`apps/api/src/reservations/availability/timezone.ts` — dependency-free zoned-time helpers
(`getLocalDateParts`, `getLocalWeekday`, `addLocalDays`, `compareLocalDateParts`,
`localWallTimeToUtc`), built on `Intl.DateTimeFormat` rather than a date library. `localWallTimeToUtc`
uses an iterative offset-correction algorithm (converges in ≤3 passes) to convert a
weekday/minute-of-day wall-clock value (as stored on `WorkingSchedule`/`Break`) into the correct UTC
instant, including across DST transitions. DST policy is deliberately documented rather than
"perfectly" disambiguated: a spring-forward gap (a wall time that never existed) resolves to whatever
instant the correction converges on; a fall-back fold (a wall time that occurs twice) resolves to the
first occurrence — both are consistent/deterministic (same input → same output), which is what
"deterministic time handling" requires here, not perfect real-world disambiguation of an inherently
ambiguous local time.
`apps/api/src/reservations/availability/availability.ts` — `computeAvailability()`, a pure function
(no I/O) taking every input as plain data: salon timezone, current instant (`now`, passed in — never
`Date.now()` inside the engine), search range, service duration/buffer, booking notice/horizon, and
per-employee working schedule/breaks/time-off/blocking-reservations/eligibility/active-status. Iterates
by *local calendar day* (not fixed 24h steps) in the salon's timezone — the detail that makes DST
handled correctly, since a "day" can be 23 or 25 real hours but is always exactly one calendar date.
Generates candidate starts on a configurable grid (default 15min) within each working block, filtering
out any candidate whose `[start, start + duration + buffer)` span overlaps a break, time-off period, or
blocking reservation. Buffer design decision (documented in code): buffer is trailing padding that must
not collide with the *next* commitment, but is not required to fit before the working day's own closing
time — kept deliberately simple rather than special-casing end-of-day. `computeAnyStylistAvailability()`
wraps this for the "any suitable stylist" flow, deduping identical start times across employees.
Salon-wide closures are out of scope here too, consistent with the 14.3 decision (no such input exists
yet — the function signature simply has no closure parameter to add).
Commit: pending (this task)
Tests: 26 new unit tests, all pure (no DB, no NestJS test module) — 11 for the timezone helpers
(including explicit fixtures for the 2026 US spring-forward date crossing EST→EDT, the fall-back date
crossing EDT→EST, and determinism checks for the nonexistent/duplicated wall times right at each
transition) and 15 for the availability engine (basic slot generation on a grid, inactive/ineligible
employees produce no slots, break/blocking-reservation/time-off exclusion — including the "buffer as
trailing padding" case — booking-notice and booking-horizon boundaries, multiple employees, "any
stylist" deduping, and full end-to-end DST-crossing slot generation in `America/New_York`). Two of my
own first-draft test assertions were themselves wrong (a 60-minute appointment window fully containing
a 30-minute break/reservation does *not* leave two slots free, only the touching one; 9am on the
US fall-back date is already standard time, not daylight time, since the transition happens at 2am that
same day) — caught by actually running the suite rather than assuming the math, then fixed. `apps/api`
total: 214 passing tests. Full repo gate (14/14) passed.
Security/tenant checks: n/a directly (no I/O, no auth surface) — but this is exactly the code Section
15.6's security review will need to re-verify once it's wired into a real endpoint (e.g., that callers
never let a client supply `now`, employee eligibility, or schedule data — this function trusts whatever
it's given, so the caller's job in 15.3 is to make sure that's always server-derived).
Risks: none new. The real risk surface is Section 15.3 (the actual booking transaction, concurrency,
and endpoint authorization) — this slice is intentionally inert (no DB, no route) so it carries no
runtime risk on its own.
Next: Section 15.3 — Customer booking transaction (the first endpoint in this area; separate session
per the playbook)

## Blockers / environment notes

- Docker is not installed in this environment; resolved by using the existing Postgres.app (PG 18)
  installation instead (see Section 8) — a `salonomia` database/role now exists locally and all
  migrations/tests have been verified against it. Node v24.15.0 and pnpm 11.17.0 confirmed available.
