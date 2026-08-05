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

## Blockers / environment notes

- Docker is not installed in this environment; resolved by using the existing Postgres.app (PG 18)
  installation instead (see Section 8) — a `salonomia` database/role now exists locally and all
  migrations/tests have been verified against it. Node v24.15.0 and pnpm 11.17.0 confirmed available.
