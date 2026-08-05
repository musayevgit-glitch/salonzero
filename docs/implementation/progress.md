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

## Blockers / environment notes

- Docker is not installed in this environment; resolved by using the existing Postgres.app (PG 18)
  installation instead (see Section 8) — a `salonomia` database/role now exists locally and all
  migrations/tests have been verified against it. Node v24.15.0 and pnpm 11.17.0 confirmed available.
