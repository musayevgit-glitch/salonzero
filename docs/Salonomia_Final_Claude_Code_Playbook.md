# Salonomia — Claude Code Build Playbook

## 0. Project Goal

Build a production-ready, multi-tenant salon discovery, management, and reservation platform named **Salonomia**.

The system has four roles:

- **SUPERADMIN** — platform owner. Can access and manage every salon, user, permission, setting, report, audit log, and platform-level feature.
- **SALON_ADMIN** — owns or administers one salon. Can manage that salon's profile, employees, services, schedules, reservations, customers, settings, and reports.
- **SALON_MANAGER** — operational booking manager for one salon. Can view, create, update, confirm, reject, cancel, and reschedule reservations within the assigned salon. Cannot modify salon ownership, permissions, billing, sensitive settings, employees, services, or financial reports unless explicitly granted later.
- **CUSTOMER** — public user. Can browse salons, services, and stylists; manage their profile; create and manage their own reservations; and view their own reservation history.

The implementation must prioritize:

- secure tenant isolation;
- server-side authorization;
- field-level validation;
- accessible responsive UI;
- reliable reservation flows;
- auditability;
- automated testing;
- maintainable architecture;
- minimal duplication;
- production-safe defaults.

---


# FINAL STACK DECISION

## Selected production stack

Use this stack unless an approved Architecture Decision Record documents a compelling reason to change it:

- **Runtime:** current Node.js LTS
- **Package manager:** pnpm
- **Monorepo:** pnpm workspaces + Turborepo
- **Public web application:** Next.js App Router + TypeScript
- **Administrative dashboard:** Next.js App Router + TypeScript
- **Backend API:** NestJS running on Node.js
- **Database:** PostgreSQL
- **ORM and migrations:** Prisma
- **Shared validation:** Zod
- **Forms:** React Hook Form + Zod resolver
- **UI:** Tailwind CSS + accessible headless primitives
- **Authentication:** vetted session-based authentication solution selected in an ADR
- **Authorization:** centralized RBAC plus tenant-aware policy functions
- **Testing:** Vitest/Jest, Testing Library, Supertest, Playwright
- **API documentation:** OpenAPI
- **File storage:** S3-compatible object storage using signed uploads
- **Local infrastructure:** Docker Compose
- **Caching/queues:** Redis only when a measured requirement exists
- **Observability:** structured logging, error tracking, metrics, and immutable audit events

## Why Next.js is selected

Salonomia is not only a static marketing site. It includes:

- public discovery and SEO pages;
- authentication;
- large forms;
- role-based dashboards;
- interactive reservation calendar;
- availability queries;
- responsive management tables and lists;
- customer account pages;
- complex loading, error, and permission states.

Next.js gives the project:

- server rendering and static rendering where appropriate;
- React Server Components;
- mature React UI and testing ecosystem;
- strong support from coding agents;
- route-level loading and error states;
- image and font optimization;
- straightforward Node.js or Docker deployment;
- a shared component model across public and dashboard applications.

Next.js does not guarantee a fast website by itself. Performance rules in this playbook are mandatory.

## Considered alternatives

### SvelteKit

SvelteKit is a valid high-performance alternative and may ship less client-side JavaScript for some interfaces.

Do not select it only because it may benchmark faster on a simple page. Changing to SvelteKit would also change:

- the component ecosystem;
- form and table libraries;
- developer familiarity;
- availability of project examples;
- AI-generated code reliability;
- hiring and maintenance considerations.

Use SvelteKit only if the project owner intentionally chooses Svelte and accepts the ecosystem trade-off before Phase 2.

### Astro

Astro is excellent for content-first and mostly static websites because it hydrates only interactive islands.

It is not selected as the main Salonomia framework because the product contains highly interactive authenticated applications. Using Astro for the public site and Next.js for dashboards would create:

- two frontend frameworks;
- duplicated components and design tokens;
- more CI and deployment complexity;
- more authentication and routing integration work;
- greater maintenance cost.

Astro may be reconsidered later for a separate marketing site only after the core product is stable and performance measurements justify the split.

### Single Next.js full-stack application

Next.js route handlers or server actions could implement the backend in an early prototype. They are not selected as the primary domain API for this production playbook.

NestJS is preferred because Salonomia has:

- four roles;
- multi-tenant authorization;
- reservation state transitions;
- transaction and concurrency rules;
- audit logs;
- reports;
- notification workflows;
- likely future mobile or partner clients.

A dedicated API keeps domain logic, authorization, validation, and transaction boundaries explicit.

## Performance budget

The project must define and enforce performance budgets rather than relying on framework marketing.

Public pages:

- prefer Server Components;
- keep Client Components small and isolated;
- avoid shipping dashboard libraries to public routes;
- render salon discovery and profile content on the server;
- use pagination or cursor-based loading;
- optimize images and responsive sizes;
- use route-level caching only when tenant/privacy rules allow it;
- keep private customer pages out of public caches;
- lazy-load non-critical maps, galleries, and review widgets;
- measure Core Web Vitals in production.

Dashboard:

- load only data required by the current view;
- use server-side pagination/filtering;
- virtualize only genuinely large collections;
- avoid large calendar libraries unless justified;
- split heavy editors, charts, maps, and upload tools;
- avoid global client state for server-owned data;
- prevent request waterfalls;
- use optimistic UI only when rollback behavior is safe.

API:

- use indexed tenant-scoped queries;
- avoid N+1 queries;
- cap pagination and export sizes;
- cache only data with clear invalidation rules;
- protect expensive search/report endpoints;
- use background jobs for slow notifications and exports when necessary;
- measure before introducing Redis or queues.

## Final architecture rule

Do not change framework during implementation because of an isolated slow page.

First:

1. profile the page;
2. identify client JavaScript, query, image, caching, or rendering bottlenecks;
3. fix the measured bottleneck;
4. document the result.

A framework replacement requires an ADR and project-owner approval.


# 1. Recommended Technical Architecture

Use this stack unless a written Architecture Decision Record approves a change:

- **Monorepo:** pnpm workspaces + Turborepo
- **Web applications:** Next.js + TypeScript
- **API:** NestJS + TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod for shared schemas; class-validator only at NestJS transport boundaries when required
- **Authentication:** secure session-based authentication or a vetted auth library
- **Authorization:** centralized RBAC plus tenant-aware policy checks
- **UI:** Tailwind CSS + accessible headless components
- **Forms:** React Hook Form + shared Zod schemas
- **Testing:** Vitest/Jest, Testing Library, Playwright
- **API documentation:** OpenAPI
- **Queues/jobs:** introduce only when required
- **Storage:** S3-compatible storage with signed upload flows
- **Observability:** structured logs, error tracking, audit logs
- **Local development:** Docker Compose for PostgreSQL and optional supporting services

Suggested repository structure:

```text
salonomia/
├── apps/
│   ├── web/                  # customer-facing website
│   ├── dashboard/            # superadmin/salon admin/manager interface
│   └── api/                  # NestJS API
├── packages/
│   ├── ui/                   # shared accessible design system
│   ├── validation/           # shared Zod schemas
│   ├── auth/                 # shared auth types and policies
│   ├── database/             # Prisma schema/client
│   ├── config/               # lint, tsconfig, env helpers
│   └── contracts/            # API contracts and shared types
├── docs/
│   ├── architecture/
│   ├── product/
│   ├── security/
│   ├── testing/
│   └── adr/
├── .claude/
│   ├── agents/
│   ├── skills/
│   └── settings.json
├── CLAUDE.md
└── README.md
```

---


# AUTHORITATIVE SPECIFICATION ORDER

When documents overlap, use this precedence:

1. approved security requirements and threat model;
2. approved Architecture Decision Records;
3. approved role-permission matrix;
4. this final playbook;
5. feature-specific product specifications;
6. implementation notes.

For the customer booking journey, the embedded **Optimal Customer Reservation Flow**
section in this document is authoritative for UI, UX, validation, authorization,
availability, concurrency, and customer ownership behavior.

No agent may silently override a higher-priority document. A conflict must be recorded
as an open decision or ADR before implementation.


# 2. Non-Negotiable Security Rules

1. Never trust role, salon ID, user ID, price, duration, status, or permission values sent by the client.
2. Every protected backend operation must perform server-side authentication, authorization, tenant membership, and resource ownership checks.
3. Every tenant-owned database query must be scoped by the authorized salon ID.
4. Never query a tenant-owned entity by plain ID and then authorize afterward. Include tenant scope in the query itself.
5. SUPERADMIN bypass must be explicit, centralized, logged, and tested.
6. SALON_ADMIN and SALON_MANAGER must never access another salon through changed URLs, request bodies, query strings, or guessed IDs.
7. CUSTOMER can only access and mutate their own profile and reservations.
8. Use deny-by-default authorization.
9. Validate all request input and all environment variables.
10. Reject unknown fields for security-sensitive requests.
11. Use database constraints for invariants that must never be violated.
12. Prevent double booking using transactions and database-enforced overlap protection or an equally strong locking strategy.
13. Store timestamps in UTC; convert only at presentation boundaries.
14. Store salon timezone explicitly.
15. Never expose secrets or sensitive internal errors to clients.
16. Rate-limit authentication, reservation creation, public search, password reset, and other abuse-prone endpoints.
17. Use secure cookies, CSRF protection where relevant, safe CORS, and strict security headers.
18. File uploads must validate MIME type, size, extension, and ownership; use random server-generated names and signed uploads.
19. Record security-sensitive and business-critical actions in immutable audit logs.
20. A feature is incomplete until authorization and validation tests exist.

---

# 3. Role Permission Matrix

## SUPERADMIN

Can:

- create, read, update, suspend, restore, and delete salons according to retention policy;
- enter any salon context;
- manage platform users and salon memberships;
- manage all salon employees, services, schedules, portfolios, customers, and reservations;
- manage platform-level and salon-level settings;
- manage subdomains and domains;
- view global and per-salon reports;
- inspect audit and system logs;
- override operational state only through explicit audited actions;
- manage role assignments and permission policies.

Cannot:

- bypass audit logging;
- perform destructive actions without confirmation and authorization;
- retrieve secrets in plaintext.

## SALON_ADMIN

Can only within assigned salon:

- edit salon public and operational information;
- manage employees and stylist profiles;
- manage services, prices, durations, categories, and availability;
- manage employee schedules, breaks, time off, and service assignments;
- manage all salon reservations;
- manage salon customers and notes subject to privacy rules;
- view operational and monthly reports for that salon;
- manage salon-specific policies and booking rules;
- invite or remove SALON_MANAGER users for that salon, if enabled by policy.

Cannot:

- view or manage another salon;
- create or delete platform salons;
- assign SUPERADMIN;
- change platform-wide settings;
- view global reports or platform logs;
- access secrets or internal infrastructure settings.

## SALON_MANAGER

Can only within assigned salon:

- list and search reservations;
- create manual reservations;
- confirm, reject, reschedule, cancel, mark no-show, check in, and complete reservations;
- view required customer contact information for reservation operations;
- view service and stylist availability.

Cannot:

- edit salon ownership or sensitive settings;
- manage users, roles, or permissions;
- create, delete, or modify employees and services;
- view revenue, payroll, or sensitive reports unless separately authorized later;
- export full customer datasets;
- access another salon.

## CUSTOMER

Can:

- browse active salons, services, employees/stylists, portfolios, reviews, and available slots;
- create an account and manage own profile;
- create reservations for themselves;
- view, reschedule, or cancel their own eligible reservations according to salon policy;
- view their own reservation history and notifications.

Cannot:

- view another customer's information;
- access dashboards;
- set reservation status directly;
- override price, service duration, employee availability, or booking policy;
- access internal salon notes or reports.

---

# 4. Claude Code Project Rules

Create `CLAUDE.md` with these rules:

```md
# Salonomia Project Instructions

## Working style
- Read relevant docs and existing code before changing anything.
- Work on one approved milestone at a time.
- Do not implement future milestones.
- Prefer small, reviewable diffs.
- Never rewrite unrelated files.
- Never silently change architecture, dependencies, or public contracts.
- Ask only when a missing decision creates a security or data-loss risk.
- Otherwise choose the safest conventional default and record it in an ADR.
- Keep responses compact: summary, files changed, tests, risks, next command.
- Do not paste entire files unless requested.

## Quality gates
A task is not complete until:
- code compiles;
- lint passes;
- type checking passes;
- relevant unit/integration/E2E tests pass;
- authorization is server-side;
- validation exists at trust boundaries;
- tenant isolation is tested;
- accessibility and responsive behavior are checked for UI work;
- documentation is updated.

## Security
- Deny by default.
- Never trust client-supplied identity, role, salon ID, price, duration, or status.
- Scope tenant-owned queries by authorized salon ID.
- Do not query by ID first and authorize later.
- Add regression tests for every security fix.
- Never log secrets, tokens, passwords, or unnecessary personal data.
- Do not weaken security controls to make tests pass.

## Database
- All tenant-owned records must have an explicit tenant relationship.
- Use transactions for multi-step state changes.
- Enforce invariants with database constraints where possible.
- Migrations must be reversible or accompanied by a rollback plan.
- Seed data must be obviously non-production.

## UI and UX
- Mobile-first and fully responsive.
- Keyboard accessible.
- Visible focus states.
- Semantic HTML and accessible labels.
- Handle loading, empty, error, success, disabled, and permission-denied states.
- Destructive actions require explicit confirmation.
- Never hide security solely in the UI; backend authorization is mandatory.

## Output format
1. Result
2. Files changed
3. Tests run
4. Security/tenant checks
5. Remaining risks
6. Next recommended task
```

---

# 5. Claude Skills

Create each skill as `.claude/skills/<skill-name>/SKILL.md`.

## Skill: secure-feature

```md
---
name: secure-feature
description: Apply when implementing or reviewing any authenticated, tenant-owned, permission-sensitive, or data-changing feature.
---

Before implementation:

1. Identify actors, assets, entry points, trust boundaries, and abuse cases.
2. State who may perform the action and under which salon context.
3. Identify all client-controlled fields.
4. Define validation and normalization rules.
5. Define transaction and concurrency requirements.
6. Define audit event requirements.
7. Define rate-limit and privacy requirements.

During implementation:

- authorize on the server;
- scope database operations to the authorized tenant;
- use deny-by-default policies;
- reject unknown or forbidden fields;
- avoid mass assignment;
- avoid exposing internal errors;
- record audit events for sensitive actions.

Required tests:

- unauthenticated request;
- wrong role;
- correct role;
- correct role, wrong salon;
- guessed or modified resource ID;
- malformed and boundary input;
- forbidden field injection;
- duplicate/replayed request where relevant;
- concurrency conflict where relevant;
- audit log creation.
```

## Skill: responsive-ui

```md
---
name: responsive-ui
description: Apply to every new or modified page, layout, component, form, dashboard, table, calendar, dialog, and navigation flow.
---

Design mobile-first.

Test widths:
- 320px;
- 375px;
- 768px;
- 1024px;
- 1440px.

Requirements:

- no horizontal overflow;
- touch targets approximately 44px where practical;
- keyboard navigation;
- visible focus;
- semantic headings;
- labels and descriptions for fields;
- accessible dialogs;
- correct table alternatives on mobile;
- loading, empty, error, permission-denied, and success states;
- skeletons only where they improve comprehension;
- inline validation near the related field;
- preserve entered data after recoverable errors;
- destructive actions require clear confirmation;
- do not use color as the only status indicator;
- meet reasonable WCAG AA contrast;
- support reduced motion;
- support long names and translated text;
- never expose actions the user cannot perform, but still enforce permission on the server.

For each UI task, provide:
1. user flow;
2. information hierarchy;
3. responsive behavior;
4. accessibility checklist;
5. implemented states;
6. Playwright scenarios.
```

## Skill: validation-contract

```md
---
name: validation-contract
description: Apply whenever creating or changing forms, DTOs, API requests, query parameters, route parameters, environment variables, imports, or database writes.
---

For every field define:

- type;
- required/optional/nullable distinction;
- minimum and maximum length/value;
- accepted format;
- normalization;
- trimming behavior;
- empty-string behavior;
- enum values;
- cross-field rules;
- uniqueness behavior;
- user-facing error message;
- database constraint;
- authorization relevance;
- privacy classification.

Use shared Zod schemas when frontend and backend share the contract.
Do not rely only on browser validation.
Reject unknown fields on sensitive write operations.
Use server-derived values for identity, tenant, role, price, duration, and protected status fields.
Add boundary and malformed-input tests.
```

## Skill: reservation-integrity

```md
---
name: reservation-integrity
description: Apply to availability, slot generation, reservation creation, manual booking, confirmation, cancellation, rescheduling, employee schedules, breaks, and time off.
---

Before code, define:

- salon timezone;
- service duration and buffer rules;
- employee-service eligibility;
- employee working hours;
- breaks and time off;
- salon closures;
- minimum notice;
- maximum advance period;
- cancellation and reschedule windows;
- status transition rules;
- manual booking privileges;
- capacity and resource constraints;
- idempotency requirements;
- concurrency strategy.

Never trust availability calculated only in the browser.
Re-check availability inside the final transaction.
Prevent overlapping confirmed/held reservations at the database or transaction level.
Use UTC persistence and explicit timezone conversion.
Return safe conflict responses without leaking private booking details.

Required tests include simultaneous booking attempts for the same slot.
```

## Skill: test-gate

```md
---
name: test-gate
description: Apply before declaring any milestone or feature complete.
---

Run the smallest relevant checks first, then the full affected suite.

Required:
- formatting;
- lint;
- strict type check;
- unit tests;
- integration tests;
- authorization and tenant-isolation tests;
- database constraint tests;
- Playwright happy path;
- Playwright permission-denied path;
- responsive viewport checks;
- accessibility smoke checks;
- production build.

Do not claim success if a command was not run.
Report exact failures.
Do not delete or weaken tests to obtain a green result.
```

## Skill: security-review

```md
---
name: security-review
description: Apply for threat modeling, security audit, pre-release review, and review of authentication, authorization, uploads, exports, logging, reservations, and administrative features.
---

Review:

- broken access control;
- tenant escape;
- IDOR/BOLA;
- privilege escalation;
- mass assignment;
- injection;
- XSS;
- CSRF;
- SSRF;
- insecure redirects;
- unsafe uploads;
- authentication enumeration;
- session fixation and cookie configuration;
- rate limiting and abuse;
- secrets exposure;
- sensitive logging;
- insecure error messages;
- cache leaks;
- unsafe exports;
- race conditions;
- reservation double booking;
- dependency and supply-chain risks.

Output findings with:
- severity;
- affected component;
- attack scenario;
- evidence;
- recommended fix;
- regression test.

Do not modify code until the audit report is approved unless explicitly instructed.
```

---

# 6. Specialized Subagents

Create files in `.claude/agents/`.

## `architect.md`

```md
---
name: architect
description: Designs architecture, boundaries, data flows, ADRs, and implementation milestones. Does not implement product features.
tools: Read, Grep, Glob
model: opus
---

Act as a principal software architect.

Study requirements and existing documentation.
Produce architecture decisions, diagrams in Mermaid, boundaries, risks, and acceptance criteria.
Optimize for tenant isolation, maintainability, security, testability, and incremental delivery.
Do not write production feature code.
Do not expand scope.
```

## `security-reviewer.md`

```md
---
name: security-reviewer
description: Performs adversarial security and tenant-isolation reviews. Read-only unless explicitly asked to fix approved findings.
tools: Read, Grep, Glob, Bash
model: opus
---

Act as an application security engineer.
Assume attackers can control URLs, IDs, JSON bodies, headers, browser state, timing, and concurrent requests.
Prioritize broken access control and cross-tenant leakage.
Produce evidence-backed findings and required regression tests.
Do not approve security based on UI restrictions.
```

## `ui-reviewer.md`

```md
---
name: ui-reviewer
description: Reviews UI, UX, accessibility, responsive behavior, states, and design-system consistency.
tools: Read, Grep, Glob, Bash
model: sonnet
---

Act as a senior product designer and accessibility-minded frontend engineer.
Review mobile and desktop flows, state coverage, forms, navigation, feedback, hierarchy, and keyboard accessibility.
Prefer reusable design-system patterns.
Do not redesign outside the requested feature.
```

## `test-engineer.md`

```md
---
name: test-engineer
description: Designs and implements focused unit, integration, authorization, tenant-isolation, concurrency, and E2E tests.
tools: Read, Grep, Glob, Bash, Edit, Write
model: sonnet
---

Act as a senior test engineer.
Derive tests from requirements and abuse cases.
Prioritize tenant escape, permission mistakes, malformed input, state transitions, and concurrency.
Do not change production behavior merely to simplify tests.
```

## `database-reviewer.md`

```md
---
name: database-reviewer
description: Reviews Prisma schema, migrations, constraints, indexes, tenant scoping, deletion policies, and transactional integrity.
tools: Read, Grep, Glob, Bash
model: sonnet
---

Act as a PostgreSQL and Prisma specialist.
Review normalization, constraints, indexes, transaction boundaries, tenant ownership, uniqueness, timestamps, soft deletion, and migration safety.
Pay special attention to reservation overlap prevention.
```

---

# 7. Optional Hooks

Hooks provide deterministic enforcement. Configure them only after the related commands exist.

Suggested `.claude/settings.json` concept:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "pnpm format:check && pnpm lint && pnpm typecheck"
          }
        ]
      }
    ]
  }
}
```

For large repositories this can be expensive. A cheaper strategy is:

- run lightweight checks after edits;
- run focused tests after a feature;
- run the full suite before milestone completion.

Never create a hook that silently rewrites code, deletes files, changes migrations, or suppresses failures.

---

# 8. Token-Saving Working Method

Use a fresh Claude Code session for each milestone.

At the start of a session:

```text
Read CLAUDE.md and only the documents required for milestone N.
Do not scan generated files, build output, dependencies, or unrelated modules.
Summarize the relevant constraints in at most 12 bullets.
Then propose a file-level plan. Do not implement yet.
```

After plan approval:

```text
Implement only the approved plan.
Keep the diff small.
Do not explain basic code.
Run focused checks.
Return only:
- result;
- files changed;
- tests;
- security checks;
- remaining risks.
```

Add these folders to ignore/context exclusions where supported:

```text
node_modules
.next
dist
coverage
playwright-report
test-results
generated
*.log
```

Do not keep one conversation for the entire project.
Use documentation and commits as durable memory.
Commit after each accepted milestone.

Recommended branch pattern:

```text
main
develop
feat/architecture-foundation
feat/auth-rbac
feat/tenant-database
feat/superadmin-salons
feat/salon-admin
feat/reservations
feat/customer-booking
test/security-audit
```

---

# 9. Phase-by-Phase Master Prompts

## Phase 0 — Product Specification and Scope Lock

```text
You are the principal product architect for Salonomia.

Read CLAUDE.md and the project brief.

Goal:
Create an implementation-ready product specification for a multi-tenant salon management and reservation SaaS.

Roles:
- SUPERADMIN
- SALON_ADMIN
- SALON_MANAGER
- CUSTOMER

Do not write application code.

Create:
- docs/product/product-spec.md
- docs/product/role-permission-matrix.md
- docs/product/domain-glossary.md
- docs/product/user-flows.md
- docs/product/acceptance-criteria.md
- docs/product/out-of-scope.md
- docs/product/open-decisions.md

Cover:
- public salon discovery;
- salon and stylist catalog;
- customer accounts;
- employee and service management;
- schedules, breaks, and time off;
- online and manual reservations;
- reservation status lifecycle;
- salon admin operations;
- salon manager operations;
- superadmin operations;
- monthly reports;
- notifications;
- audit logs;
- salon timezone and booking policies;
- responsive and accessible UI states.

For every user flow include:
- actor;
- preconditions;
- happy path;
- alternate paths;
- validation failures;
- permission failures;
- concurrency conflicts;
- final state;
- audit events;
- acceptance criteria.

Resolve ordinary product ambiguities using safe conventional defaults.
Put decisions with meaningful business impact into open-decisions.md.
Keep scope suitable for an MVP, but do not omit security or correctness requirements.

Return only:
1. documents created;
2. critical decisions;
3. open decisions;
4. recommended next phase.
```

## Phase 1 — Architecture and Threat Model

```text
Use the architect and security-reviewer subagents.

Read only:
- CLAUDE.md;
- docs/product/*.

Do not implement application features.

Design the production architecture for Salonomia.

Create:
- docs/architecture/system-overview.md
- docs/architecture/context-diagram.md
- docs/architecture/container-diagram.md
- docs/architecture/component-boundaries.md
- docs/architecture/request-flows.md
- docs/architecture/tenant-isolation.md
- docs/architecture/error-handling.md
- docs/architecture/observability.md
- docs/security/threat-model.md
- docs/security/security-requirements.md
- docs/security/data-classification.md
- docs/adr/0001-monorepo.md
- docs/adr/0002-multi-tenancy.md
- docs/adr/0003-authentication.md
- docs/adr/0004-authorization.md
- docs/adr/0005-reservation-concurrency.md

Threat-model at minimum:
- cross-tenant access;
- privilege escalation;
- IDOR/BOLA;
- mass assignment;
- malicious manual reservations;
- double booking and race conditions;
- session theft;
- CSRF;
- XSS;
- injection;
- password reset abuse;
- account enumeration;
- upload abuse;
- report/export leakage;
- audit-log tampering;
- sensitive logging;
- subdomain/domain takeover risks;
- denial of service and scraping.

Define trust boundaries and security controls.
For each threat include mitigation and required test coverage.

End with a milestone plan containing small vertical slices.
Do not generate boilerplate yet.
```

## Phase 2 — Repository Foundation

```text
Read:
- CLAUDE.md;
- approved architecture documents;
- approved ADRs.

Implement only repository foundation.

Create the monorepo structure:
- apps/web;
- apps/dashboard;
- apps/api;
- packages/ui;
- packages/validation;
- packages/auth;
- packages/database;
- packages/contracts;
- packages/config.

Configure:
- strict TypeScript;
- pnpm workspaces;
- Turborepo;
- linting and formatting;
- environment validation;
- Docker Compose for PostgreSQL;
- Prisma;
- test frameworks;
- Playwright;
- shared scripts;
- CI quality gates;
- basic health endpoint;
- basic application shells.

Do not implement authentication, roles, salon CRUD, reservations, or business features.

Requirements:
- no secrets committed;
- example environment file;
- production-safe environment validation;
- consistent error/result conventions;
- structured logging foundation;
- dependency versions pinned by lockfile;
- README setup instructions.

Run:
- install;
- format check;
- lint;
- type check;
- unit test;
- production build.

Return the exact commands and results.
```

## Phase 3 — Database Domain Model

```text
Use the database-reviewer and security-reviewer subagents.

Read approved product and architecture documents.

Design and implement only the database domain model and migrations.

Include entities as required:
- User;
- Account/Session/Auth-related records;
- Salon;
- SalonDomain;
- SalonMembership;
- Role/Permission representation;
- EmployeeProfile;
- EmployeePortfolioItem;
- ServiceCategory;
- Service;
- EmployeeService;
- WorkingSchedule;
- Break;
- TimeOff;
- CustomerProfile;
- SalonCustomer relationship if required;
- Reservation;
- ReservationStatusHistory;
- SalonBookingPolicy;
- Notification;
- AuditLog.

Requirements:
- explicit tenant ownership;
- correct foreign keys;
- unique constraints;
- indexes for actual query paths;
- UTC timestamps;
- salon timezone;
- soft-delete policy where justified;
- safe cascades/restrict behavior;
- money represented safely;
- no free-form role strings without validation;
- reservation state history;
- immutable audit event design;
- migration and rollback notes.

Do not implement controllers or UI.

Create:
- docs/architecture/data-model.md
- docs/architecture/data-retention.md
- docs/adr/0006-deletion-and-retention.md

Add database tests proving:
- tenant relationships;
- uniqueness;
- required fields;
- deletion behavior;
- invalid reservation states cannot be persisted where enforceable.

Do not implement a weak application-only overlap check.
Document the selected double-booking prevention strategy.
```

## Phase 4 — Authentication and Authorization

```text
Apply secure-feature and validation-contract skills.
Use security-reviewer and test-engineer subagents.

Implement authentication and centralized authorization only.

Required flows:
- customer registration;
- login;
- logout;
- session refresh/rotation as applicable;
- forgot password;
- reset password;
- email verification if included in approved scope;
- admin invitation and acceptance;
- disabled/suspended account handling.

Implement:
- secure password handling;
- secure session cookies;
- CSRF protection where relevant;
- rate limiting;
- account enumeration resistance;
- safe redirects;
- server-side role and tenant policies;
- reusable authorization guards/policy functions;
- current user endpoint;
- audit events.

Permission rules:
- SUPERADMIN platform-wide;
- SALON_ADMIN only assigned salon;
- SALON_MANAGER only assigned salon and reservation operations;
- CUSTOMER only own data and permitted public resources.

Never accept effective role or salon scope from the client.

Add tests for every role/action combination, including:
- unauthenticated;
- wrong role;
- right role/wrong salon;
- suspended membership;
- manipulated salon ID;
- manipulated user ID;
- revoked session;
- expired invitation;
- reset token replay.

Create:
- docs/security/authentication.md
- docs/security/authorization.md
- docs/testing/authorization-matrix.md

Do not implement dashboard business pages yet.
```

## Phase 5 — Shared Design System and Application Shells

```text
Apply responsive-ui and validation-contract skills.
Use ui-reviewer and test-engineer subagents.

Create the shared accessible design system and application shells only.

Create reusable:
- typography;
- spacing and layout primitives;
- buttons;
- links;
- inputs;
- text areas;
- selects;
- comboboxes;
- date/time inputs;
- form field wrapper;
- alerts;
- toasts;
- badges;
- cards;
- tables;
- mobile data lists;
- pagination;
- tabs;
- breadcrumbs;
- dialogs;
- confirmation dialogs;
- drawers;
- dropdown menus;
- empty states;
- skeleton/loading states;
- permission-denied state;
- error boundaries;
- responsive navigation;
- dashboard sidebar/header;
- public site header/footer.

Requirements:
- mobile-first;
- keyboard accessible;
- visible focus;
- semantic markup;
- no horizontal overflow at 320px;
- support long content;
- loading, empty, error, success, disabled states;
- reusable permission-aware UI wrapper for presentation only;
- backend remains authoritative.

Create a development showcase page for components.
Add accessibility and responsive Playwright smoke tests.
Do not build domain pages yet.
```

## Phase 6 — Superadmin Vertical Slice

```text
Apply secure-feature, responsive-ui, validation-contract, and test-gate skills.

Implement the SUPERADMIN salon-management vertical slice.

Features:
- salon list with search, filters, pagination, status;
- create salon;
- view salon details;
- edit salon;
- suspend/restore salon;
- deletion flow according to retention policy;
- assign initial SALON_ADMIN;
- manage salon domain/subdomain;
- enter an explicit audited salon-context view;
- view salon membership summary;
- view platform-safe operational summary;
- view relevant audit events.

Requirements:
- every write audited;
- sensitive/destructive actions require confirmation;
- domain values normalized and validated;
- prevent domain conflicts;
- prevent unsafe deletion;
- no secret exposure;
- tenant context must be explicit;
- UI must show all states;
- full mobile/desktop behavior.

Tests:
- SUPERADMIN success;
- all other roles denied;
- validation boundaries;
- duplicate domain;
- destructive-action confirmation;
- audit logs;
- pagination and filtering;
- E2E happy path and denial path.

Do not implement salon operational management beyond what this slice requires.
```

## Phase 7 — Salon Admin Management

```text
Apply all relevant skills.
Use security-reviewer, ui-reviewer, database-reviewer, and test-engineer.

Implement SALON_ADMIN features only for the assigned salon:

- edit allowed salon profile fields;
- manage public contact/location information;
- manage booking policy;
- manage employees and stylist profiles;
- activate/deactivate employees;
- manage employee portfolios;
- manage service categories;
- manage services, prices, durations, buffers, and active state;
- assign services to employees;
- manage weekly schedules;
- manage breaks;
- manage time off;
- invite/remove SALON_MANAGER memberships;
- view salon customers required for operations;
- view monthly operational report defined in approved scope.

Field-level restrictions:
- protected ownership/platform fields cannot be updated;
- tenant ID cannot be changed;
- role cannot be escalated;
- service price and duration use server-validated values;
- uploads follow secure upload policy.

For every endpoint test:
- right salon;
- wrong salon;
- wrong role;
- forbidden field injection;
- inactive employee/service;
- invalid schedule;
- overlapping time off;
- duplicate service or membership rules where applicable.

Ensure responsive mobile management flows, not only desktop tables.
```

## Phase 8 — Reservation Engine

```text
Apply reservation-integrity, secure-feature, validation-contract, and test-gate skills.
Use database-reviewer, security-reviewer, and test-engineer.

Implement the reservation domain and availability engine.

Define and enforce status transitions, for example:
- PENDING;
- CONFIRMED;
- REJECTED;
- CANCELLED_BY_CUSTOMER;
- CANCELLED_BY_SALON;
- CHECKED_IN;
- COMPLETED;
- NO_SHOW.

Do not assume this list is final; use the approved specification.

Implement:
- availability query;
- slot generation;
- customer reservation creation;
- salon manager manual reservation creation;
- confirmation/rejection;
- rescheduling;
- cancellation;
- check-in;
- completion;
- no-show;
- status history;
- notification events;
- idempotency where required;
- audit events.

Availability must account for:
- salon timezone;
- employee schedule;
- breaks;
- time off;
- service duration;
- buffers;
- employee-service eligibility;
- salon closure;
- booking notice;
- booking horizon;
- existing blocking reservations.

Security:
- CUSTOMER only acts on own reservations;
- SALON_MANAGER only operational reservation actions in assigned salon;
- SALON_ADMIN full reservation operations in assigned salon;
- SUPERADMIN explicit audited override;
- client cannot set price, duration, tenant, protected statuses, or customer identity arbitrarily.

Concurrency:
- re-check availability inside transaction;
- prevent double booking under simultaneous requests;
- add a concurrency integration test that launches competing booking attempts;
- exactly one conflicting booking may succeed.

Produce a state-transition document and test matrix.
```

## Phase 9 — Salon Manager Dashboard

```text
Apply responsive-ui, secure-feature, validation-contract, and test-gate.

Implement the SALON_MANAGER experience.

Features:
- today/day/week reservation views;
- mobile operational list;
- search and filters;
- reservation detail;
- create manual reservation;
- confirm;
- reject with reason;
- reschedule;
- cancel;
- check in;
- complete;
- mark no-show;
- safe customer contact display;
- clear conflict and stale-data handling.

The manager must not:
- manage employees;
- manage services;
- manage roles;
- modify salon settings;
- view protected financial or platform reports;
- export full customer data;
- access another salon.

Add route, component, API, and E2E permission tests.
Test mobile flows at 375px and desktop at 1440px.
```

## Phase 10 — Customer-Facing Website

```text
Apply responsive-ui, validation-contract, reservation-integrity, and test-gate.
Use ui-reviewer, security-reviewer, and test-engineer.

Implement the customer-facing experience:

Public:
- home/discovery;
- salon search and filters;
- salon details;
- service catalog;
- stylist catalog;
- stylist portfolio;
- availability selection.

Authenticated customer:
- profile;
- create reservation;
- reservation confirmation;
- upcoming reservations;
- reservation history;
- eligible cancellation;
- eligible rescheduling.

UX requirements:
- mobile-first booking;
- persistent summary of salon, service, stylist, date, time, price;
- clear timezone;
- no hidden fees;
- preserve selections after recoverable errors;
- conflict response returns to availability with explanation;
- accessible date/slot selection;
- empty, loading, error, and unavailable states;
- prevent duplicate submission;
- do not expose private reservation details in public availability.

Security:
- server recomputes price, duration, eligibility, and availability;
- customer identity comes from the authenticated session;
- private pages cannot be cached publicly;
- one customer cannot access another customer's reservation by changing IDs.

Add full Playwright booking journey on mobile and desktop.
```

## Phase 11 — Reports, Audit Logs, and Operational Hardening

```text
Apply secure-feature and test-gate.
Use security-reviewer and database-reviewer.

Implement approved reporting and audit interfaces.

Reports:
- SUPERADMIN global and per-salon;
- SALON_ADMIN own salon only;
- SALON_MANAGER no financial report access by default;
- CUSTOMER none.

Define metrics precisely.
Ensure date ranges use salon timezone correctly.
Prevent cross-tenant aggregation leakage.
Apply limits to expensive queries and exports.
Do not expose unnecessary personal data.

Audit:
- searchable by authorized scope;
- immutable event records;
- actor, action, target, tenant, timestamp, safe metadata;
- no passwords, tokens, secrets, or excessive personal data;
- SUPERADMIN access only unless approved otherwise.

Add permission and tenant-isolation tests for every report and audit query.
```

## Phase 12 — Complete Security Audit

```text
Use the security-reviewer subagent and security-review skill.

Do not modify code during the first pass.

Perform an adversarial audit of the full repository.

Review:
- authentication;
- sessions and cookies;
- password reset;
- authorization;
- tenant isolation;
- role escalation;
- IDOR/BOLA;
- mass assignment;
- validation;
- reservation race conditions;
- CSRF;
- XSS;
- injection;
- SSRF;
- file uploads;
- redirects;
- CORS;
- security headers;
- rate limits;
- logs;
- exports;
- caching;
- secrets;
- dependencies;
- error handling;
- subdomain handling;
- privacy and retention.

Create:
- docs/security/final-audit.md

For each finding include:
- ID;
- severity;
- confidence;
- attack scenario;
- affected files;
- evidence;
- remediation;
- regression test.

Then stop and request approval of the remediation plan.
```

## Phase 13 — Security Remediation

```text
Read the approved final audit and remediation plan.

Fix findings in severity order:
1. critical;
2. high;
3. medium;
4. low.

One finding or tightly related group per commit.

For each fix:
- add a failing regression test first where practical;
- make the smallest safe change;
- run focused tests;
- run affected integration/E2E tests;
- update the audit finding status;
- do not weaken unrelated functionality.

After all fixes:
- run the complete quality gate;
- request a second independent security-reviewer pass.
```

## Phase 14 — Production Readiness

```text
Apply test-gate and security-review skills.

Prepare for production without deploying.

Create:
- docs/operations/deployment.md
- docs/operations/environment-variables.md
- docs/operations/backup-and-restore.md
- docs/operations/incident-response.md
- docs/operations/monitoring.md
- docs/operations/release-checklist.md

Verify:
- production build;
- database migration workflow;
- rollback strategy;
- backups and restore test;
- secret management;
- security headers;
- cookie configuration;
- CORS;
- rate limiting;
- health/readiness checks;
- structured logs;
- error tracking;
- audit retention;
- privacy-safe analytics;
- alerting;
- dependency scanning;
- container hardening where applicable;
- no development endpoints;
- no debug secrets;
- seed scripts cannot affect production accidentally.

Run the complete test suite and report exact results.
Do not claim production-ready if any critical or high issue remains.
```

---

# 10. Per-Feature Prompt Template

Use this template for every small feature:

```text
Read CLAUDE.md and only the documents and modules relevant to this feature.

Feature:
[ONE FEATURE]

Actor:
[ROLE]

Tenant scope:
[PLATFORM / ASSIGNED SALON / OWN CUSTOMER DATA]

Acceptance criteria:
- [criterion]
- [criterion]
- [criterion]

Before coding:
1. identify authorization rules;
2. identify validation rules;
3. identify data and transaction changes;
4. identify UI states;
5. identify tests;
6. propose a file-level plan.

Do not implement until the plan is complete.

Implementation constraints:
- server-side authorization;
- tenant-scoped queries;
- reject forbidden fields;
- accessible mobile-first UI;
- no unrelated refactor;
- update docs;
- focused diff.

Required tests:
- unauthenticated;
- wrong role;
- wrong tenant or owner;
- valid request;
- malformed input;
- boundary input;
- forbidden field injection;
- relevant conflict/concurrency case;
- mobile E2E;
- desktop E2E.

After implementation return only:
- result;
- files changed;
- commands/tests and outcomes;
- security checks;
- remaining risks.
```

---

# 11. Bug-Fix Prompt

```text
Investigate this bug without changing code first:

[BUG DESCRIPTION]

Steps:
1. reproduce or identify the exact failing path;
2. locate the root cause;
3. identify security and tenant-isolation impact;
4. propose the smallest safe fix;
5. define a regression test.

Do not perform broad refactoring.
Do not guess success.
After the plan, implement only the approved fix and regression test.
Run focused checks and report exact results.
```

---

# 12. UI Review Prompt

```text
Use the ui-reviewer subagent and responsive-ui skill.

Review this feature:
[FEATURE OR ROUTE]

Do not change code during the first pass.

Evaluate:
- information hierarchy;
- navigation;
- desktop layout;
- tablet layout;
- 320px and 375px mobile layout;
- keyboard navigation;
- focus order;
- labels and error association;
- contrast;
- loading/empty/error/success/permission states;
- destructive actions;
- long content;
- touch targets;
- booking-flow clarity;
- permission-appropriate actions.

Create a prioritized UI/UX report with:
- severity;
- user impact;
- affected component;
- recommended change;
- acceptance test.

Then stop.
```

---

# 13. Permission Audit Prompt

```text
Use the security-reviewer and test-engineer subagents.

Audit authorization and tenant isolation for:
[MODULE]

Do not modify code first.

Build a matrix containing:
- action;
- SUPERADMIN;
- SALON_ADMIN same salon;
- SALON_ADMIN other salon;
- SALON_MANAGER same salon;
- SALON_MANAGER other salon;
- CUSTOMER owner;
- CUSTOMER non-owner;
- unauthenticated.

Trace each action from route/controller to policy to database query.
Flag:
- missing server-side checks;
- query-by-ID-before-scope;
- client-controlled tenant;
- mass assignment;
- hidden UI without backend protection;
- inconsistent policy usage;
- missing denial tests.

Produce findings and exact regression tests.
Then stop.
```

---

# 14. Final Definition of Done

A feature is done only when:

- approved acceptance criteria are met;
- backend authorization exists;
- tenant isolation is query-level;
- input validation exists;
- forbidden fields are rejected;
- database invariants are enforced;
- happy and denial paths are tested;
- mobile and desktop UI work;
- keyboard and basic accessibility checks pass;
- loading, empty, error, success, and permission states exist;
- audit event exists where required;
- no critical/high security finding remains;
- lint, type check, tests, and production build pass;
- documentation is updated;
- change is committed as a small reviewable unit.

A milestone is done only when the independent reviewer subagents approve it after tests.


---

# EMBEDDED AUTHORITATIVE CUSTOMER RESERVATION SPECIFICATION

# Salonomia — Optimal Customer Reservation Flow

## Məqsəd

Bu sənəd müştərinin salon siyahısından başlayaraq uğurlu rezervasiya yaratmasına qədər ən məntiqli, rahat və təhlükəsiz flow-u müəyyən edir.

Əsas ardıcıllıq:

```text
Salon discovery
→ Salon profile
→ Service selection
→ Stylist preference
→ Date and time
→ Booking summary
→ Login or registration
→ Final confirmation
→ Booking result
```

---

# 1. Salon Discovery

İstifadəçi sayta daxil olduqda aktiv salonların siyahısını görür.

Hər salon kartında göstərilir:

- salon adı;
- əsas şəkil;
- ünvan və məsafə;
- reytinq və rəy sayı;
- əsas xidmət kateqoriyaları;
- başlanğıc qiymət;
- bu gün açıq və ya bağlı statusu;
- ən yaxın boş vaxt;
- “Salona bax” düyməsi.

Filterlər:

- məkan;
- xidmət;
- qiymət aralığı;
- reytinq;
- mövcud tarix;
- qadın, kişi və ya uniseks salon;
- açıq olan salonlar;
- ən yaxın boş vaxt.

Sort seçimləri:

- ən uyğun;
- ən yaxın;
- ən yüksək reytinq;
- ən aşağı qiymət;
- ən yaxın boş vaxt.

## UX qaydaları

- İstifadəçi login olmadan salonları görə bilməlidir.
- Filterlər mobil cihazda drawer və ya bottom sheet daxilində açılmalıdır.
- Filter nəticələri dəyişəndə istifadəçinin scroll mövqeyi qorunmalıdır.
- Boş nəticə zamanı alternativ filter təklifləri göstərilməlidir.

---

# 2. Salon Profile

İstifadəçi salonu seçdikdə salon profilinə keçir.

Salon profilində göstərilir:

- salon adı və şəkilləri;
- ünvan və xəritə;
- əlaqə məlumatları;
- iş saatları;
- salon haqqında məlumat;
- xidmət kateqoriyaları;
- xidmətlər və qiymətlər;
- stilistlər;
- stilist portfolio-ları;
- reytinq və rəylər;
- salonun rezervasiya və ləğv qaydaları;
- “Rezervasiya et” düyməsi.

## UX qaydaları

- Mobil cihazda “Rezervasiya et” düyməsi aşağıda sticky ola bilər.
- Xidmət seçilmədən tarix və saat seçiminə keçilməməlidir.
- Qiymət “başlayır” tipindədirsə bu açıq göstərilməlidir.
- Salon timezone-u istifadəçiyə aydın göstərilməlidir.

---

# 3. Service Selection

İstifadəçi rezervasiya etmək istədiyi xidməti seçir.

Hər xidmət üçün göstərilir:

- xidmət adı;
- qısa təsvir;
- qiymət;
- müddət;
- əlavə buffer vaxtı varsa məlumat;
- xidməti göstərən stilistlər;
- aktiv və ya əlçatmaz status.

## Qaydalar

- Yalnız aktiv xidmətlər rezervasiya edilə bilər.
- Qiymət və müddət client tərəfindən göndərilsə belə server onları qəbul etməməlidir.
- Server xidmətin real qiymətini və müddətini database-dən götürməlidir.
- Bir rezervasiyada birdən çox xidmət MVP-də dəstəklənmirsə, bu açıq şəkildə məhdudlaşdırılmalıdır.

## Validation

- `serviceId` tələb olunur.
- Xidmət seçilən salona aid olmalıdır.
- Xidmət aktiv olmalıdır.
- Xidmət rezervasiya vaxtında mövcud olmalıdır.

---

# 4. Stylist Preference

İstifadəçi iki seçimdən birini seçir:

## Variant A — Konkret stilist

İstifadəçi müəyyən stilisti seçir.

Göstərilir:

- stilist adı;
- şəkil;
- ixtisas;
- reytinq;
- portfolio;
- seçilən xidmət üzrə uyğunluğu;
- ən yaxın boş vaxt.

## Variant B — Fərqi yoxdur

İstifadəçi “Ən uyğun boş stilist” seçimini edir.

Sistem seçilən xidmət üçün:

- xidməti yerinə yetirə bilən;
- həmin tarixdə işləyən;
- boş slotu olan;
- aktiv;
- uyğun salona aid

stilistlərdən birini rezervasiya zamanı server tərəfində seçir.

## UX qaydaları

- “Fərqi yoxdur” seçimi default və rahat görünməlidir.
- İstifadəçi konkret stilist seçməyə məcbur edilməməlidir.
- Stilist seçildikdə yalnız həmin stilistin slotları göstərilməlidir.
- “Fərqi yoxdur” seçildikdə bütün uyğun stilistlərin ümumi boş slotları göstərilməlidir.

## Təhlükəsizlik

- Client tərəfindən göndərilən `employeeId` serverdə salon və xidmət ilə yoxlanmalıdır.
- Stilist həmin salona aid olmalıdır.
- Stilist aktiv olmalıdır.
- Stilist seçilən xidməti göstərə bilməlidir.

---

# 5. Date and Time Selection

İstifadəçi tarix və boş vaxt seçir.

Göstərilir:

- uyğun günlər;
- boş slotlar;
- salon timezone-u;
- seçilən xidmətin müddəti;
- seçilən stilist və ya “ən uyğun stilist”;
- əlçatmaz gün və saatların izahı.

## Availability hesablanarkən nəzərə alınır

- salonun timezone-u;
- salonun iş saatları;
- stilistin iş qrafiki;
- fasilələr;
- məzuniyyət və time-off;
- salonun bağlı günləri;
- xidmət müddəti;
- buffer vaxtı;
- mövcud rezervasiyalar;
- minimum qabaqcadan rezervasiya müddəti;
- maksimum gələcək rezervasiya intervalı;
- xidmət və stilist uyğunluğu.

## UX qaydaları

- Keçmiş tarixlər seçilə bilməz.
- Boş olmayan saatlar disabled olmalıdır.
- Mobil cihazda slotlar rahat touch ölçüsündə göstərilməlidir.
- Saat seçildikdə rezervasiya xülasəsi dərhal yenilənməlidir.
- Slotlar seçilən salonun timezone-u ilə göstərilməlidir.

## Təhlükəsizlik

Frontend availability yalnız preview-dur.

Final rezervasiya yaradılarkən server:

1. xidməti yenidən yoxlayır;
2. stilisti yenidən yoxlayır;
3. slotu yenidən hesablayır;
4. transaction daxilində conflict yoxlaması edir;
5. yalnız bundan sonra rezervasiyanı yaradır.

---

# 6. Booking Summary

Login mərhələsindən əvvəl istifadəçiyə tam xülasə göstərilir.

Xülasədə:

- salon;
- ünvan;
- xidmət;
- stilist və ya “ən uyğun stilist”;
- tarix;
- saat;
- timezone;
- müddət;
- qiymət;
- əlavə ödəniş varsa məlumat;
- ləğv və reschedule qaydası;
- rezervasiya statusunun necə yaranacağı.

## UX qaydaları

- Xülasə bütün mərhələlərdə desktop-da sidebar, mobile-da collapsible card kimi görünə bilər.
- İstifadəçi əvvəlki addımlara qayıdıb seçimini dəyişə bilməlidir.
- Geri qayıdanda digər seçimlər mümkün qədər qorunmalıdır.
- Qiymət final deyilsə “təxmini qiymət” açıq yazılmalıdır.

---

# 7. Login or Registration

İstifadəçi hələ login olmayıbsa yalnız bu mərhələdə authentication tələb olunur.

Seçimlər:

- login;
- yeni hesab yaratmaq;
- Google və ya başqa təsdiqlənmiş provider ilə giriş;
- təsdiqlənmiş guest booking yalnız məhsul qərarı ilə.

## Əsas UX prinsipi

İstifadəçi authentication-dan sonra rezervasiya seçimlərini itirməməlidir.

Saxlanmalı məlumatlar:

- salon;
- xidmət;
- stilist seçimi;
- tarix;
- saat;
- rezervasiya xülasəsi.

## Təhlükəsizlik

- Redirect yalnız allowlist edilmiş daxili route-a olmalıdır.
- Authentication məlumatları URL-də saxlanmamalıdır.
- Reservation draft daxilində qiymət, tenant və user identity etibarlı mənbə sayılmamalıdır.
- Customer identity session-dan götürülməlidir.

---

# 8. Final Confirmation Form

Login-dən sonra istifadəçi final formu görür.

Form field-ləri:

- ad və soyad — profildən;
- telefon nömrəsi;
- optional customer note;
- salon qaydalarının qəbul checkbox-u;
- marketing checkbox-u ayrıca və optional;
- final “Rezervasiya et” düyməsi.

## Validation

### Ad və soyad

- required;
- trim;
- minimum və maksimum uzunluq;
- yalnız boşluqdan ibarət ola bilməz.

### Telefon

- required;
- server-side normalize;
- qəbul edilən region və format açıq müəyyən edilir;
- çox uzun və ya qısa nömrələr rədd edilir.

### Customer note

- optional;
- trim;
- maksimum uzunluq;
- HTML qəbul edilmir;
- output zamanı escape edilir.

### Terms acceptance

- required;
- marketing consent ilə birləşdirilə bilməz.

## UX qaydaları

- Submit zamanı düymə disable edilir.
- Double-click duplicate rezervasiya yaratmamalıdır.
- Validation xətaları field-in yanında göstərilir.
- Server conflict xətasında seçimlər itmir.
- İstifadəçi slotu dəyişmək üçün availability mərhələsinə qaytarılır.

---

# 9. Server-Side Booking Creation

Final submit zamanı backend aşağıdakı ardıcıllığı icra edir:

1. Session-dan customer identity-ni götürür.
2. Request schema-nı validate edir.
3. Salonun aktiv olduğunu yoxlayır.
4. Xidmətin salona aid və aktiv olduğunu yoxlayır.
5. Stilist seçilibsə salon və xidmət uyğunluğunu yoxlayır.
6. “Fərqi yoxdur” seçilibsə uyğun stilistləri server özü müəyyən edir.
7. Salon booking policy-ni oxuyur.
8. Qiymət və müddəti server database-dən götürür.
9. Slotu yenidən hesablayır.
10. Transaction başladır.
11. Eyni vaxt üçün conflict-i yenidən yoxlayır.
12. Uyğun stilisti lock və ya təhlükəsiz concurrency strategiyası ilə seçir.
13. Rezervasiyanı yaradır.
14. İlkin status tarixçəsini yaradır.
15. Audit və notification event yaradır.
16. Transaction-u commit edir.
17. Təhlükəsiz response qaytarır.

## Client-in müəyyən edə bilmədiyi field-lər

Client bunları etibarlı şəkildə təyin edə bilməz:

- `customerId`;
- `salonId` authorization scope kimi;
- final price;
- service duration;
- protected reservation status;
- discount;
- employee eligibility;
- tenant ownership;
- audit actor;
- createdAt;
- completedAt.

---

# 10. Reservation Initial Status

Salon booking policy-dən asılı olaraq rezervasiya iki formada yarana bilər.

## Auto-confirm salon

```text
CONFIRMED
```

Bu yalnız:

- slot təhlükəsiz şəkildə ayrıldıqda;
- əlavə manual approval tələb olunmadıqda;
- salon policy auto-confirm etdikdə

istifadə olunur.

## Manual approval salon

```text
PENDING
```

Salon Manager və ya Salon Admin rezervasiyanı:

- confirm;
- reject;
- reschedule təklifi;
- cancel

edə bilər.

Customer-a status aydın göstərilməlidir:

- “Rezervasiyanız təsdiqləndi”
- və ya “Rezervasiya salon təsdiqi gözləyir”

---

# 11. Success Page

Uğurlu rezervasiyadan sonra göstərilir:

- rezervasiya nömrəsi;
- salon;
- xidmət;
- stilist;
- tarix və saat;
- timezone;
- status;
- qiymət;
- salon ünvanı;
- ləğv və reschedule qaydası;
- “Rezervasiyalarıma bax” düyməsi;
- calendar-a əlavə etmə seçimi;
- notification məlumatı.

## Təhlükəsizlik

- Reservation ID URL-dən dəyişdirilərsə başqa müştərinin məlumatı görünməməlidir.
- Success page customer ownership yoxlaması etməlidir.
- Private reservation response public cache-ə düşməməlidir.

---

# 12. Error and Conflict Flow

## Slot artıq tutulubsa

Mesaj:

```text
Seçdiyiniz saat artıq əlçatan deyil.
Məlumatlarınız qorundu. Zəhmət olmasa başqa vaxt seçin.
```

Sistem:

- istifadəçini availability mərhələsinə qaytarır;
- salon və xidmət seçimini qoruyur;
- yeni slotları yükləyir;
- private booking məlumatı göstərmir.

## Salon və ya xidmət deaktiv edilibsə

- rezervasiya yaradılmır;
- aydın error state göstərilir;
- istifadəçiyə salon profilinə və ya axtarışa qayıtmaq imkanı verilir.

## Network və ya server xətası

- duplicate submission-dan qorunur;
- istifadəçinin form məlumatları qorunur;
- retry düyməsi göstərilir;
- rezervasiyanın yaranıb-yaranmadığı idempotency ilə müəyyən olunur.

---

# 13. Customer Reservation Management

Customer profilində:

- upcoming reservations;
- pending reservations;
- completed reservations;
- cancelled reservations;
- reservation details;
- eligible cancellation;
- eligible rescheduling.

Customer yalnız:

- öz rezervasiyalarını görə bilər;
- salon policy icazə verirsə ləğv edə bilər;
- salon policy icazə verirsə reschedule edə bilər.

Customer:

- statusu birbaşa `CONFIRMED` və ya `COMPLETED` edə bilməz;
- başqa customer rezervasiyasını görə bilməz;
- price və service duration dəyişə bilməz;
- salon qeydlərini görə bilməz.

---

# 14. Recommended Mobile Flow

Mobil ardıcıllıq:

```text
Salon list
→ Salon details
→ Select service
→ Choose stylist preference
→ Select date
→ Select time
→ Review summary
→ Login/register
→ Confirm booking
→ Success
```

Mobil UI:

- bir addım bir ekran;
- sticky continue button;
- sticky və ya collapsible booking summary;
- back action seçimləri qoruyur;
- progress indicator;
- 44px ətrafında touch target;
- date və slotlar horizontal overflow yaratmır;
- keyboard açıldıqda submit düyməsi itmir.

---

# 15. Recommended Desktop Flow

Desktop-da:

- əsas content solda;
- booking summary sağ sidebar-da;
- mərhələlər stepper ilə göstərilir;
- salon, xidmət, stilist və slot dəyişdikcə summary yenilənir;
- final mərhələdə bütün məlumatlar bir baxışda görünür.

Desktop flow mobile flow-dan funksional olaraq fərqli olmamalıdır.

---

# 16. Final Acceptance Criteria

Flow hazır sayılır yalnız bunlar keçərsə:

- istifadəçi login olmadan salonları görə bilir;
- xidmət seçə bilir;
- konkret stilist və ya “fərqi yoxdur” seçə bilir;
- yalnız real boş slotlar göstərilir;
- login sonrası seçimlər qorunur;
- server qiyməti və müddəti özü hesablayır;
- customer identity session-dan götürülür;
- wrong salon və wrong employee request-ləri rədd edilir;
- duplicate submit duplicate booking yaratmır;
- eyni slot üçün iki paralel request-dən yalnız biri uğurlu olur;
- başqa customer rezervasiyasına ID dəyişməklə giriş mümkün deyil;
- mobile və desktop flow problemsiz işləyir;
- validation, loading, empty, error və success state-ləri mövcuddur;
- keyboard və basic accessibility testləri keçir;
- rezervasiya uyğun olaraq `PENDING` və ya `CONFIRMED` yaranır;
- notification və status history yaradılır.

---

# Claude Code Implementation Prompt

```text
Read:
- CLAUDE.md;
- the approved product specification;
- the approved authentication and authorization documents;
- the approved reservation state model;
- docs/product/customer-reservation-flow.md.

Implement the customer reservation flow exactly as documented.

Required sequence:
Salon discovery
→ Salon profile
→ Service selection
→ Stylist preference
→ Date and time
→ Booking summary
→ Login or registration
→ Final confirmation
→ Booking result.

Apply:
- responsive-ui;
- validation-contract;
- reservation-integrity;
- secure-feature;
- test-gate.

Critical requirements:
- login happens after the user selects salon, service, stylist preference, date, and time;
- preserve the booking draft after authentication;
- support a specific stylist or “any suitable stylist”;
- never trust price, duration, customer identity, tenant scope, status, or availability from the client;
- recalculate and re-check availability inside the final transaction;
- prevent double booking under concurrent requests;
- customer can only access their own reservations;
- mobile-first UI with complete loading, empty, error, conflict, success, and permission-denied states;
- no unrelated refactoring.

Before implementation:
1. map the flow to routes, components, API endpoints, schemas, and database operations;
2. define authorization and validation rules;
3. define the concurrency strategy;
4. define Playwright journeys for mobile and desktop;
5. propose a file-level plan.

Do not implement until the plan is complete.

Required tests:
- public salon discovery;
- service selection;
- specific stylist;
- any suitable stylist;
- no available slots;
- login with preserved draft;
- registration with preserved draft;
- invalid service;
- employee from another salon;
- inactive employee or service;
- manipulated price and duration;
- malformed fields;
- double submit;
- simultaneous booking conflict;
- customer ownership;
- cancellation and rescheduling policy;
- 375px mobile journey;
- 1440px desktop journey;
- keyboard accessibility smoke test.

After implementation return only:
1. result;
2. files changed;
3. tests and exact outcomes;
4. authorization and validation checks;
5. concurrency result;
6. remaining risks.
```


---

# FINAL PROJECT BOOTSTRAP

Create the project folder:

```bash
mkdir salonomia
cd salonomia
git init
mkdir -p docs/product
```

Place this file at:

```text
docs/Salonomia_Final_Claude_Code_Playbook.md
```

Start Claude Code and run only this prompt:

```text
Read docs/Salonomia_Final_Claude_Code_Playbook.md.

Execute only Phase 0 — Product Specification and Scope Lock.

The FINAL STACK DECISION and embedded customer reservation specification
are authoritative.

Do not initialize frameworks.
Do not write application code.
Do not continue to Phase 1.
Do not broaden the MVP.

Return only the output requested by Phase 0.
```

After reviewing Phase 0:

```bash
git add .
git commit -m "docs: define Salonomia product specification"
```

Start a new Claude Code session for every phase. Never ask one session to build the full product.
