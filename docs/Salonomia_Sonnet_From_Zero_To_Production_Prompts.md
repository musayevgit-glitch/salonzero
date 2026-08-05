# Salonomia — Sonnet Build Sequence
## From Empty Folder to Production-Ready Release

This document is the execution order for building Salonomia with Claude Code using a Sonnet-class model while conserving Claude Pro usage.

It supplements:

```text
docs/Salonomia_Final_Claude_Code_Playbook.md
```

The final playbook remains the authoritative architecture, security, role, and reservation specification.

---

# 0. Usage Strategy

## Core rule

Never ask Claude to build the whole application.

Use:

```text
one session
→ one narrow objective
→ one approved plan
→ one small implementation
→ focused tests
→ one commit
```

Start a fresh Claude Code session when:

- moving to a new numbered phase;
- changing from backend to frontend;
- moving from implementation to audit;
- context becomes large;
- Claude starts discussing unrelated files;
- a milestone has been committed.

## Sonnet workload allocation

Use the selected Sonnet model for:

- product specifications;
- repository setup;
- normal architecture documentation;
- database implementation;
- authentication implementation;
- CRUD;
- UI components;
- responsive layouts;
- tests;
- API documentation;
- bug fixes;
- routine security reviews.

Keep expensive reasoning short and isolated for:

- final multi-tenant architecture decision;
- authentication/session design;
- authorization policy design;
- reservation concurrency;
- final security audit.

Even for these tasks, request a report first and implementation in a separate session.

## Compact response contract

Add this to every implementation prompt:

```text
Keep your response compact.

Do not paste full files.
Do not explain framework basics.
Do not repeat the task.
Do not list unchanged files.

Return only:
1. result;
2. files changed;
3. commands and exact outcomes;
4. security and tenant checks;
5. remaining risks.
```

## Context control

At the beginning of every session:

```text
Read CLAUDE.md.

Read only the files explicitly listed in this task and files directly
required to understand the affected module.

Do not scan:
- node_modules;
- .next;
- dist;
- coverage;
- generated clients;
- lockfile contents unless dependency work is required;
- unrelated applications;
- unrelated documentation.

Use grep/glob before opening large files.
Do not read an entire large file when a relevant section is enough.
```

## Implementation rule

Always separate planning from coding.

Planning session prompt:

```text
Do not write code.

Inspect only the relevant files.
Produce:
- assumptions;
- security rules;
- validation rules;
- file-level plan;
- tests;
- risks.

Keep the plan under 80 lines.
```

Implementation session prompt:

```text
Implement only the approved plan.
Do not broaden the scope.
Do not refactor unrelated code.
```

---

# 1. Create the Empty Project

Run manually:

```bash
mkdir salonomia
cd salonomia
git init
mkdir -p docs
```

Place these files in `docs/`:

```text
Salonomia_Final_Claude_Code_Playbook.md
Salonomia_Sonnet_Build_Sequence.md
```

Start Claude Code.

---

# 2. Bootstrap Claude Project Governance

## Prompt 2.1 — Create Claude configuration

```text
Read:
- docs/Salonomia_Final_Claude_Code_Playbook.md;
- docs/Salonomia_Sonnet_Build_Sequence.md.

Execute only the Claude Code governance setup.

Create:
- CLAUDE.md;
- .claude/skills/secure-feature/SKILL.md;
- .claude/skills/validation-contract/SKILL.md;
- .claude/skills/reservation-integrity/SKILL.md;
- .claude/skills/test-gate/SKILL.md;
- .claude/skills/security-review/SKILL.md;
- .claude/skills/apple-inspired-luxury-web/SKILL.md;
- .claude/agents/architect.md;
- .claude/agents/security-reviewer.md;
- .claude/agents/ui-reviewer.md;
- .claude/agents/test-engineer.md;
- .claude/agents/database-reviewer.md.

Do not initialize any framework.
Do not create product documents.
Do not create application code.

The project instruction files must be concise and avoid duplicated wording.
Keep CLAUDE.md under 180 lines.

Return only:
- files created;
- purpose of each;
- any conflict found in the playbook.
```

Commit:

```bash
git add .
git commit -m "chore: configure Claude project governance"
```

---

# 3. Apple-Inspired Luxury Web Skill

Create this exact skill if Prompt 2.1 did not create an equivalent version.

File:

```text
.claude/skills/apple-inspired-luxury-web/SKILL.md
```

Content:

```md
---
name: apple-inspired-luxury-web
description: Apply to Salonomia public pages, authentication pages, customer booking flows, dashboards, forms, navigation, responsive layouts, and visual review.
---

# Purpose

Create a modern, luxurious, calm, simple, trustworthy beauty-platform experience.

Use Apple Human Interface Guidelines as inspiration for:
- clarity;
- hierarchy;
- consistency;
- progressive disclosure;
- comfortable spacing;
- direct manipulation;
- immediate feedback;
- accessibility;
- adaptive layouts.

Do not copy Apple pages, branding, proprietary assets, product visuals, or exact component styling.

This is a web application. Follow web conventions and WCAG requirements.

# Visual direction

The interface should feel:

- premium but not flashy;
- feminine without stereotypes;
- minimal but not empty;
- warm and trustworthy;
- clean and operationally efficient;
- consistent across public site and dashboards.

Use:
- generous whitespace;
- strong typography hierarchy;
- subtle borders;
- restrained shadows;
- rounded corners used consistently;
- a limited color system;
- one primary accent;
- calm neutral surfaces;
- high-quality salon photography;
- clear status badges;
- purposeful motion only.

Avoid:
- excessive glassmorphism;
- excessive gradients;
- glowing effects;
- giant empty hero sections;
- tiny low-contrast text;
- crowded cards;
- decorative animations;
- every section being placed in a card;
- multiple competing accent colors;
- generic AI-generated landing-page patterns;
- copying Apple's product page layouts.

# Design-system requirements

Define tokens for:
- colors;
- typography;
- spacing;
- radii;
- shadows;
- borders;
- motion;
- breakpoints;
- z-index;
- content widths.

Do not place unexplained one-off visual values throughout components.

# Typography

Use a modern web-safe or properly licensed web font selected in the design ADR.

Requirements:
- readable body size;
- comfortable line height;
- limited number of font weights;
- responsive heading sizes;
- no important information in uppercase-only text;
- tabular numbers for prices and reports where useful.

# Layout

Design mobile-first.

Required viewports:
- 320px;
- 375px;
- 768px;
- 1024px;
- 1280px;
- 1440px.

Requirements:
- no horizontal overflow;
- stable content widths;
- adaptive sidebars;
- mobile alternatives for wide tables;
- sticky actions only when they do not hide content;
- safe spacing around device edges;
- long Azerbaijani and English strings must not break layouts.

# Interaction

Every interaction must provide:
- hover where appropriate;
- active state;
- visible keyboard focus;
- disabled state;
- loading state;
- success feedback;
- error feedback.

Do not use hover as the only way to access information.

Use motion sparingly:
- fast;
- subtle;
- interruptible;
- respectful of reduced-motion settings.

# Forms

Forms must:
- use persistent visible labels;
- show required/optional state clearly;
- place validation near the field;
- preserve valid user input after recoverable errors;
- show helpful examples only when needed;
- avoid placeholder-only labels;
- group related fields;
- prevent duplicate submission;
- show server and client validation consistently;
- use appropriate autocomplete attributes;
- use input modes suitable for mobile.

# Customer booking flow

The booking flow must:
- show progress;
- keep a visible or collapsible booking summary;
- allow back navigation without losing valid choices;
- show salon, service, stylist, date, time, timezone, duration, and price;
- make “any suitable stylist” easy to select;
- explain pending versus confirmed status;
- handle a lost slot gracefully;
- place authentication after the main selection steps;
- preserve the draft through authentication.

# Dashboard UX

Dashboards must prioritize operational work.

Use:
- actionable summaries;
- clear filters;
- server-side pagination;
- mobile lists instead of compressed desktop tables;
- contextual actions;
- explicit permission-denied states;
- confirmations for destructive actions;
- empty states with a useful next action.

Do not build dashboards as collections of decorative analytics cards.

# Accessibility

Requirements:
- semantic HTML;
- logical headings;
- keyboard navigation;
- visible focus;
- accessible names;
- field-error associations;
- meaningful alt text;
- status announcements where required;
- reasonable WCAG AA contrast;
- color is not the only status signal;
- reduced motion;
- dialogs trap and restore focus correctly;
- touch targets approximately 44px where practical.

# Review output

For each UI implementation report only:
1. information hierarchy;
2. responsive behavior;
3. interaction states;
4. accessibility checks;
5. remaining design risks.
```

This skill is based on principles, not on imitating an Apple website.

---

# 4. Product Specification

## Prompt 4.1 — Product scope

```text
Read:
- CLAUDE.md;
- docs/Salonomia_Final_Claude_Code_Playbook.md.

Execute only Phase 0: Product Specification and Scope Lock.

Create the product documents defined in the playbook.

Important:
- the embedded customer reservation flow is authoritative;
- roles are SUPERADMIN, SALON_ADMIN, SALON_MANAGER, CUSTOMER;
- do not add payments, payroll, marketplace commissions, loyalty,
  chat, native applications, or AI features to the MVP;
- record optional future features as out of scope;
- keep documents implementation-ready but concise;
- do not write application code.

Use one table for the permission matrix.
Use Mermaid only for the four most important user flows.
Do not duplicate the same requirements across multiple documents.

Return only:
- documents created;
- decisions made;
- open business decisions requiring owner input.
```

Review decisions, edit if needed, then commit:

```bash
git add .
git commit -m "docs: lock Salonomia MVP product scope"
```

---

# 5. Architecture and Threat Model

## Prompt 5.1 — Architecture plan

```text
Read:
- CLAUDE.md;
- docs/product/*;
- only the stack and architecture sections of the final playbook.

Do not write code.

Design the architecture using:
- Next.js App Router;
- Node.js;
- NestJS;
- PostgreSQL;
- Prisma;
- Zod;
- pnpm workspaces;
- Turborepo.

Create only the architecture and ADR documents required by Phase 1.

Focus deeply on:
- trust boundaries;
- tenant resolution;
- server-side authorization;
- session model;
- reservation concurrency;
- audit logging;
- public versus private caching;
- subdomain handling;
- API boundaries.

Avoid speculative infrastructure.
Do not add Redis, queues, Kubernetes, microservices, or event streaming
unless the MVP has a demonstrated requirement.

Keep diagrams small and readable.
Keep each ADR focused on one decision.
```

## Prompt 5.2 — Threat-model review

Use a fresh session:

```text
Read:
- CLAUDE.md;
- docs/product/role-permission-matrix.md;
- docs/architecture/*;
- docs/adr/*.

Act as an adversarial multi-tenant SaaS security reviewer.

Review only the architecture documents.
Do not modify files yet.

Check:
- tenant escape;
- IDOR/BOLA;
- privilege escalation;
- client-controlled salon IDs;
- query-by-ID-before-tenant-scope;
- session theft;
- CSRF;
- XSS;
- mass assignment;
- insecure domain/subdomain handling;
- export leakage;
- reservation race conditions;
- audit-log tampering;
- public-cache leakage.

Return:
- critical gaps;
- high gaps;
- exact documents needing changes;
- a compact remediation plan.

Maximum 100 lines.
```

## Prompt 5.3 — Apply approved architecture fixes

```text
Apply only the approved architecture-document fixes from the preceding review.

Do not change the stack.
Do not add application code.
Do not add speculative infrastructure.
Keep the documents concise.
```

Commit:

```bash
git add .
git commit -m "docs: define architecture and threat model"
```

---

# 6. Repository Foundation

## Prompt 6.1 — Foundation plan

```text
Read:
- CLAUDE.md;
- approved architecture ADRs;
- Phase 2 of the final playbook.

Do not write code yet.

Propose the smallest repository-foundation plan for:
- pnpm workspaces;
- Turborepo;
- apps/web;
- apps/dashboard;
- apps/api;
- packages/ui;
- packages/validation;
- packages/auth;
- packages/database;
- packages/contracts;
- packages/config;
- PostgreSQL Docker Compose;
- Prisma;
- Vitest or Jest;
- Playwright;
- lint;
- formatting;
- strict TypeScript;
- environment validation;
- CI.

Do not include business features.
Do not add unnecessary dependencies.

List exact files and commands.
```

## Prompt 6.2 — Implement foundation

```text
Implement only the approved repository-foundation plan.

Requirements:
- current stable compatible dependency versions;
- Node.js engine declared;
- package manager declared;
- strict TypeScript;
- deterministic scripts;
- example environment file;
- environment variables validated at startup;
- no secrets;
- health endpoint;
- minimal web and dashboard shells;
- no authentication;
- no roles;
- no salon domain code.

Run:
- install;
- format check;
- lint;
- type check;
- tests;
- production builds.

Keep your response compact.
```

Commit:

```bash
git add .
git commit -m "chore: initialize Salonomia monorepo"
```

---

# 7. Design Foundations Before Product UI

## Prompt 7.1 — UX and visual architecture

```text
Read:
- CLAUDE.md;
- .claude/skills/apple-inspired-luxury-web/SKILL.md;
- docs/product/user-flows.md;
- docs/product/role-permission-matrix.md.

Do not implement product pages.

Create:
- docs/design/design-principles.md;
- docs/design/information-architecture.md;
- docs/design/navigation-model.md;
- docs/design/responsive-strategy.md;
- docs/design/content-style.md;
- docs/adr/0007-design-system.md.

Visual direction:
- modern;
- luxurious;
- simple;
- calm;
- premium;
- beauty-oriented;
- not flashy;
- not generic AI SaaS;
- no Apple imitation.

Define:
- public-site navigation;
- customer account navigation;
- superadmin navigation;
- salon admin navigation;
- salon manager navigation;
- mobile navigation;
- content widths;
- breakpoint behavior;
- table-to-mobile-list behavior;
- form patterns;
- booking stepper;
- empty/error/loading states.

Do not choose random colors in this phase.
Define roles and semantics for color before hex values.
```

## Prompt 7.2 — Design tokens and shared UI

```text
Apply apple-inspired-luxury-web and responsive-ui skills.

Implement only:
- semantic design tokens;
- font setup;
- layout primitives;
- button;
- link;
- icon button;
- input;
- textarea;
- select;
- checkbox;
- radio;
- form field;
- alert;
- toast;
- badge;
- card;
- list;
- desktop table;
- mobile record list;
- pagination;
- dialog;
- confirmation dialog;
- drawer;
- dropdown;
- tabs;
- breadcrumbs;
- skeleton;
- empty state;
- error state;
- permission-denied state;
- public shell;
- dashboard shell;
- component showcase route.

Do not build salon, reservation, employee, or report pages.

Requirements:
- accessible;
- mobile-first;
- reduced motion;
- no horizontal overflow at 320px;
- no excessive glass effects;
- no one-off component colors;
- no oversized dependencies without justification.

Add focused component and Playwright accessibility smoke tests.
```

## Prompt 7.3 — Independent UI review

Fresh session:

```text
Use the ui-reviewer subagent.

Review only the shared design system and shells.

Do not modify code.

Test conceptually and through available tests at:
- 320px;
- 375px;
- 768px;
- 1024px;
- 1440px.

Check:
- visual hierarchy;
- luxury/simple direction;
- consistency;
- keyboard use;
- focus;
- labels;
- dialogs;
- mobile tables;
- overflow;
- long Azerbaijani text;
- loading/error/empty states.

Return only prioritized findings.
Maximum 80 lines.
```

Fix only approved findings, then commit:

```bash
git add .
git commit -m "feat: add accessible Salonomia design system"
```

---

# 8. Database Domain Model

## Prompt 8.1 — Data model plan

```text
Read:
- CLAUDE.md;
- role permission matrix;
- user flows;
- tenant-isolation architecture;
- reservation concurrency ADR;
- Phase 3 of the final playbook.

Do not modify code.

Design the Prisma/PostgreSQL model.

For every entity list:
- tenant ownership;
- identity;
- lifecycle;
- uniqueness;
- indexes;
- foreign keys;
- deletion policy;
- audit relevance;
- privacy class.

Pay special attention to:
- SalonMembership;
- role enum;
- EmployeeProfile;
- Service;
- EmployeeService;
- schedules;
- breaks;
- time off;
- CustomerProfile;
- Reservation;
- ReservationStatusHistory;
- BookingPolicy;
- AuditLog.

Do not create generic JSON blobs for core business data.
Do not implement controllers.
```

## Prompt 8.2 — Implement database model

```text
Implement only the approved Prisma schema, migrations, database package,
and focused database tests.

Requirements:
- explicit salon ownership;
- safe money representation;
- UTC timestamps;
- explicit salon timezone;
- safe foreign-key actions;
- indexes matching planned queries;
- no unvalidated free-form roles;
- immutable reservation status history model;
- immutable audit-event model;
- documented overlap-prevention strategy;
- development seed with fake data only.

Run migrations against the local PostgreSQL container.
Run database tests.
```

## Prompt 8.3 — Database review

Fresh session:

```text
Use the database-reviewer subagent.

Review only:
- Prisma schema;
- migrations;
- seed;
- database tests;
- data-model documentation.

Do not modify code.

Check:
- cross-tenant relationships;
- missing composite indexes;
- unsafe cascades;
- nullable mistakes;
- uniqueness;
- money;
- timezone;
- reservation concurrency;
- audit immutability;
- migration rollback risk.

Return findings only.
```

Fix approved findings and commit:

```bash
git add .
git commit -m "feat: define multi-tenant database model"
```

---

# 9. Authentication

Divide authentication from authorization to reduce context and risk.

## Prompt 9.1 — Authentication design

```text
Read:
- CLAUDE.md;
- authentication ADR;
- security requirements;
- relevant database models.

Do not write code.

Specify:
- registration;
- login;
- logout;
- session creation;
- session rotation;
- session revocation;
- password hashing;
- forgot password;
- password reset;
- account verification;
- suspended users;
- invitation acceptance;
- secure cookies;
- CSRF control;
- rate limits;
- enumeration resistance;
- safe redirects;
- audit events.

Select one vetted authentication approach compatible with Next.js,
NestJS, PostgreSQL, and the separated API architecture.

Record the final decision in an ADR.
Avoid custom cryptography.
```

## Prompt 9.2 — Authentication backend

```text
Implement only backend authentication flows and tests.

Do not implement role authorization beyond the minimum authenticated-user context.
Do not build finished UI pages.

Requirements:
- shared Zod contracts;
- safe password handling;
- secure sessions;
- session revocation;
- CSRF protection where applicable;
- rate limits;
- enumeration-resistant responses;
- reset token expiration and single use;
- safe audit events;
- no sensitive logging.

Add integration tests for attack and failure cases.
```

## Prompt 9.3 — Authentication UI

```text
Apply apple-inspired-luxury-web, validation-contract, and test-gate skills.

Implement:
- login;
- customer registration;
- forgot password;
- reset password;
- account verification status;
- invitation acceptance;
- session-expired handling.

Requirements:
- simple premium visual direction;
- mobile-first;
- persistent labels;
- password-manager compatible;
- correct autocomplete;
- preserve safe return destination;
- no account enumeration;
- complete loading/error/success states;
- keyboard accessible.

Add Playwright authentication journeys.
```

Commit:

```bash
git add .
git commit -m "feat: implement secure authentication"
```

---

# 10. Authorization and Tenant Isolation

## Prompt 10.1 — Authorization policy plan

```text
Read:
- CLAUDE.md;
- role-permission matrix;
- tenant-isolation architecture;
- auth implementation;
- relevant database models.

Do not write code.

Design centralized policies for:
- SUPERADMIN;
- SALON_ADMIN;
- SALON_MANAGER;
- CUSTOMER.

For each protected resource define:
- action;
- role;
- tenant scope;
- owner scope;
- query-level constraint;
- audit requirement.

The design must be deny-by-default.

Never use frontend visibility as authorization.
Never trust salonId, customerId, role, or membership sent by the client.
```

## Prompt 10.2 — Implement authorization core

```text
Implement only centralized authentication context, authorization guards,
policy functions, tenant resolution, and authorization test helpers.

Do not build business CRUD.

Requirements:
- deny by default;
- explicit SUPERADMIN bypass;
- bypass audited;
- active membership required;
- query-level tenant scoping helpers;
- customer ownership helpers;
- consistent forbidden/not-found behavior;
- no resource existence leakage where unsafe.

Add a complete role/tenant denial test matrix.
```

## Prompt 10.3 — Authorization audit

Fresh session:

```text
Use the security-reviewer and test-engineer subagents.

Audit the authorization core.

Try:
- changed route ID;
- changed salon ID;
- changed customer ID;
- inactive membership;
- role escalation;
- client-supplied role;
- guessed entity ID;
- SUPERADMIN bypass misuse;
- cross-salon membership;
- revoked session.

Do not modify code.
Return evidence-backed findings and missing tests only.
```

Fix approved findings and commit:

```bash
git add .
git commit -m "feat: enforce RBAC and tenant isolation"
```

---

# 11. Superadmin — Build in Small Slices

Each slice gets its own session and commit.

## Prompt 11.1 — Salon list and view

```text
Implement only the SUPERADMIN salon list and salon detail read flow.

Include:
- server-side pagination;
- search;
- status filter;
- safe summary;
- desktop table;
- mobile list;
- loading;
- empty;
- error;
- permission denied.

No create/edit/delete yet.

Add API, policy, validation, integration, and Playwright tests.
```

Commit:

```bash
git commit -am "feat: add superadmin salon browsing"
```

## Prompt 11.2 — Create salon

```text
Implement only SUPERADMIN salon creation and initial SALON_ADMIN invitation.

Include:
- validated salon fields;
- normalized slug/subdomain;
- conflict handling;
- transaction;
- audit event;
- confirmation result;
- responsive form;
- duplicate-submit protection.

Reject unknown and protected fields.
Add denial and boundary tests.
```

Commit.

## Prompt 11.3 — Edit salon

```text
Implement only SUPERADMIN salon editing.

Use an explicit allowlist of editable fields.
Do not allow arbitrary object updates.
Include optimistic-concurrency or stale-update handling if approved.
Audit every successful update.

Add cross-role denial and validation tests.
```

Commit.

## Prompt 11.4 — Suspend and restore

```text
Implement only salon suspension and restoration.

Define effects on:
- public visibility;
- admin access;
- manager access;
- new reservations;
- existing reservations;
- audit events.

Use explicit confirmation.
Do not implement hard deletion.
Add E2E denial and lifecycle tests.
```

Commit.

## Prompt 11.5 — Domain/subdomain management

```text
Implement only SUPERADMIN salon domain and subdomain management.

Requirements:
- normalization;
- reserved names;
- uniqueness;
- ownership verification workflow abstraction;
- safe redirects;
- host-header safety;
- audit events;
- no automatic trust of client host values.

Add validation and conflict tests.
```

Commit.

---

# 12. Salon Admin — Employees

## Prompt 12.1 — Employee list/detail

```text
Implement only SALON_ADMIN employee list and detail read flows for the assigned salon.

Also allow SUPERADMIN.
Deny SALON_MANAGER and CUSTOMER.

Include:
- search;
- active status;
- pagination;
- desktop table;
- mobile list;
- safe profile data;
- no cross-salon leakage.

Add policy and tenant tests.
```

Commit.

## Prompt 12.2 — Employee create/edit/status

```text
Implement only employee creation, editing, activation, and deactivation.

Use field allowlists.
Validate names, contacts, bio, status, and identifiers.
Prevent cross-salon assignment.
Audit writes.
Do not implement schedules or services yet.
```

Commit.

## Prompt 12.3 — Employee portfolio and uploads

```text
Implement only employee portfolio management.

Requirements:
- secure signed-upload abstraction;
- MIME allowlist;
- size limit;
- random object key;
- ownership verification;
- image metadata validation;
- deletion authorization;
- ordering;
- alt text;
- responsive gallery;
- no executable or SVG upload unless explicitly sanitized and approved.

Add upload abuse and cross-tenant tests.
```

Commit.

---

# 13. Salon Admin — Services

## Prompt 13.1 — Service categories

```text
Implement only service category CRUD for SALON_ADMIN in the assigned salon.

Also allow SUPERADMIN.
Deny SALON_MANAGER and CUSTOMER.

Validate:
- name;
- slug if used;
- ordering;
- active state;
- uniqueness rules.

Audit writes.
Add tenant and forbidden-field tests.
```

Commit.

## Prompt 13.2 — Services

```text
Implement only service CRUD.

Fields include only approved product fields:
- category;
- name;
- description;
- price;
- duration;
- buffer;
- active state.

Server owns tenant scope.
Represent money safely.
Validate duration and buffer boundaries.
Audit writes.
Add responsive forms and tests.
```

Commit.

## Prompt 13.3 — Employee-service assignment

```text
Implement only assigning eligible services to employees.

Both employee and service must belong to the authorized salon and be active
according to approved rules.

Prevent cross-salon IDs and duplicates.
Add tenant, role, and malformed-ID tests.
```

Commit.

---

# 14. Salon Admin — Scheduling

## Prompt 14.1 — Weekly working schedule

```text
Implement only employee weekly working schedules.

Validate:
- day;
- opening and closing time;
- no reversed intervals;
- no invalid overlap;
- salon timezone;
- active employee;
- assigned salon.

Create a responsive weekly editor.
Add boundary and tenant tests.
```

Commit.

## Prompt 14.2 — Breaks

```text
Implement only recurring or date-specific breaks as approved.

Ensure breaks:
- belong to the employee's salon;
- fit the selected schedule rules;
- do not contain invalid overlap;
- are interpreted in salon timezone.

Add clear mobile editing UX and tests.
```

Commit.

## Prompt 14.3 — Time off and closures

```text
Implement only employee time off and salon closure periods.

Validate:
- start/end;
- timezone;
- reason length;
- overlap behavior;
- affected future reservations according to approved policy.

Do not silently cancel reservations.
Surface conflicts for explicit admin action.
Audit writes.
```

Commit.

---

# 15. Reservation Engine — Backend First

This is the most critical area. Use separate sessions.

## Prompt 15.1 — Reservation state machine

```text
Read only:
- approved reservation specification;
- reservation ADR;
- relevant schema;
- authorization policies.

Do not implement endpoints.

Create:
- reservation state-transition table;
- actor permissions per transition;
- preconditions;
- side effects;
- audit events;
- notification events;
- illegal transitions;
- idempotency behavior.

Keep it concise and executable as tests.
```

Commit documentation.

## Prompt 15.2 — Availability engine

```text
Implement only the pure availability domain service and tests.

Inputs must include approved server-derived data for:
- salon timezone;
- employee schedule;
- breaks;
- time off;
- closures;
- service duration;
- buffer;
- employee-service eligibility;
- booking notice;
- booking horizon;
- blocking reservations.

No UI.
No reservation creation endpoint.

Use deterministic time handling.
Add DST and timezone tests where relevant.
```

Commit.

## Prompt 15.3 — Customer booking transaction

```text
Implement only customer reservation creation.

Apply secure-feature, validation-contract, and reservation-integrity.

Requirements:
- customer identity from session;
- salon/service/employee verified server-side;
- support specific stylist or any suitable stylist;
- price and duration from database;
- final availability re-check inside transaction;
- database-safe double-booking prevention;
- idempotency;
- initial status from salon policy;
- status history;
- audit event;
- notification event;
- privacy-safe conflict response.

No customer UI yet.

Add a real concurrent integration test where competing requests target the same slot.
Exactly one conflicting request may succeed.
```

Commit.

## Prompt 15.4 — Manager manual booking

```text
Implement only SALON_MANAGER and SALON_ADMIN manual reservation creation
inside their assigned salon.

Requirements:
- customer lookup or approved minimal customer creation;
- manager cannot choose another salon;
- service/stylist verification;
- no client-controlled price, duration, or protected status;
- final transactional availability check;
- audit actor and source = MANUAL;
- concurrency tests.

Deny CUSTOMER.
```

Commit.

## Prompt 15.5 — Reservation transitions

One session per group:

```text
Implement only confirm and reject transitions.
```

Commit.

```text
Implement only customer and salon cancellation transitions according to policy.
```

Commit.

```text
Implement only rescheduling with transactional slot release/acquisition.
```

Commit.

```text
Implement only check-in, completion, and no-show transitions.
```

Commit after each.

## Prompt 15.6 — Reservation security review

Fresh session:

```text
Use security-reviewer and database-reviewer subagents.

Audit only the reservation backend.

Do not modify code.

Attack:
- double booking;
- stale availability;
- guessed reservation ID;
- customer acting on another customer;
- manager acting in another salon;
- changed employee ID;
- changed service ID;
- changed price;
- changed duration;
- illegal status transition;
- replay;
- duplicate submit;
- timezone boundary;
- cancelled-slot reuse;
- transaction failure.

Return only critical/high/medium findings and missing regression tests.
```

Fix approved issues before frontend work.

---

# 16. Salon Manager Dashboard

## Prompt 16.1 — Reservation operations UI

```text
Apply apple-inspired-luxury-web and responsive-ui skills.

Implement the SALON_MANAGER reservation dashboard using the existing API.

Include:
- today;
- day;
- week;
- mobile operational list;
- filters;
- search;
- reservation detail;
- manual booking;
- confirm;
- reject;
- reschedule;
- cancel;
- check in;
- complete;
- no-show;
- conflict handling;
- stale-data handling.

Do not expose employee, service, role, salon settings, or financial management.

Use contextual actions based on server-provided capabilities.
Backend remains authoritative.

Add 375px and 1440px Playwright journeys.
```

## Prompt 16.2 — Manager permission review

```text
Audit the SALON_MANAGER UI and API routes.

Ensure the manager cannot:
- edit salon;
- manage employees;
- manage services;
- invite users;
- view protected reports;
- export full customer data;
- access another salon.

Do not modify code.
Return findings only.
```

Fix and commit.

---

# 17. Customer Public Website

Build public pages separately.

## Prompt 17.1 — Home and discovery

```text
Apply apple-inspired-luxury-web.

Implement only:
- home page;
- salon discovery list;
- search;
- approved filters;
- sorting;
- pagination;
- salon cards;
- loading;
- empty;
- error states.

Requirements:
- modern luxury/simple visual direction;
- server-rendered content;
- minimal client JavaScript;
- image optimization;
- SEO metadata;
- mobile-first;
- no authentication required;
- active salons only;
- no private data.

Do not build salon detail or booking yet.
```

Commit.

## Prompt 17.2 — Salon detail

```text
Implement only the public salon detail page.

Include:
- salon information;
- contact/location;
- opening hours;
- service catalog;
- stylist catalog;
- portfolios;
- booking policy summary;
- sticky mobile booking action.

Do not expose employee private contact data or internal notes.
Use server rendering and optimized images.
```

Commit.

## Prompt 17.3 — Customer profile shell

```text
Implement only authenticated CUSTOMER account navigation and profile editing.

Customer can access only their own profile.
Use field allowlists and server-side identity.
Include responsive navigation, loading, error, success, and session-expired states.
```

Commit.

---

# 18. Customer Booking UI

Use the embedded authoritative flow.

## Prompt 18.1 — Booking flow plan

```text
Read:
- embedded customer reservation specification;
- existing reservation API contracts;
- apple-inspired-luxury-web skill.

Do not write code.

Map the booking journey into:
- routes;
- server components;
- client components;
- draft state;
- authentication handoff;
- API calls;
- recovery states;
- mobile behavior;
- desktop behavior;
- Playwright journeys.

Required order:
Salon
→ Service
→ Stylist preference
→ Date
→ Time
→ Summary
→ Authentication if needed
→ Final confirmation
→ Result.

Keep the plan under 100 lines.
```

## Prompt 18.2 — Service and stylist steps

```text
Implement only service selection and stylist preference.

Support:
- specific stylist;
- any suitable stylist.

Preserve valid choices.
Show server-derived price and duration.
Do not trust UI state as availability.
Add mobile and desktop tests.
```

Commit.

## Prompt 18.3 — Date and time step

```text
Implement only date and time selection using the existing availability API.

Requirements:
- salon timezone displayed;
- past dates disabled;
- accessible slot selection;
- loading/empty/error states;
- no private booking details;
- preserve prior choices;
- mobile touch targets;
- stale result can be refreshed.

Do not create the reservation yet.
```

Commit.

## Prompt 18.4 — Summary and auth handoff

```text
Implement only booking summary and authentication handoff.

Requirements:
- show salon, service, stylist preference, date, time, timezone, duration, price;
- login happens after selection;
- preserve booking draft through login or registration;
- use safe internal return destination;
- do not put sensitive auth data in URLs;
- do not treat stored draft identity, tenant, price, or status as trusted.
```

Commit.

## Prompt 18.5 — Final confirmation and result

```text
Implement only final confirmation, booking submission, conflict recovery,
and success result.

Requirements:
- customer identity from session;
- duplicate-submit prevention;
- idempotency key;
- field validation;
- terms separate from optional marketing consent;
- lost-slot recovery preserves valid selections;
- success page ownership check;
- private no-store caching;
- clear PENDING versus CONFIRMED messaging.

Add full mobile and desktop Playwright booking journeys.
```

Commit.

## Prompt 18.6 — Customer reservations

```text
Implement only customer reservation list, detail, eligible cancellation,
and eligible rescheduling.

Customer can access only their own reservations.
Capabilities and policy decisions come from the server.
Add guessed-ID and ownership tests.
```

Commit.

---

# 19. Salon Admin Reservation View

## Prompt 19.1

```text
Implement SALON_ADMIN reservation management using the existing reservation domain.

The salon admin has all operational reservation capabilities within their salon.
Reuse manager components where appropriate without weakening policy boundaries.

Add monthly/day/week views only as approved.
Do not implement reports in this task.
Add tenant and role tests.
```

Commit.

---

# 20. Salon Manager Membership Management

## Prompt 20.1

```text
Implement only SALON_ADMIN management of SALON_MANAGER memberships
inside the assigned salon.

Include:
- invite;
- list;
- revoke;
- resend invitation if approved;
- expired invitation handling;
- active membership requirement;
- audit events.

Prevent:
- assigning SUPERADMIN;
- changing tenant;
- modifying another salon;
- self-created privilege escalation.

Add complete role tests.
```

Commit.

---

# 21. Reports

Split operational and financial reporting.

## Prompt 21.1 — Metric definitions

```text
Do not write code.

Define exact MVP report metrics:
- reservation counts by status;
- service popularity;
- employee booking utilization if approved;
- cancellation and no-show rate;
- monthly gross booked value if approved;
- completed-service revenue estimate if approved.

For each metric define:
- formula;
- source records;
- timezone;
- status inclusion;
- date boundary;
- role access;
- privacy rule.

Avoid vague dashboard numbers.
```

## Prompt 21.2 — Salon admin reports

```text
Implement only approved salon-level monthly reports.

SALON_ADMIN and SUPERADMIN may view.
SALON_MANAGER may not view financial data by default.
CUSTOMER may not view.

Every query must be tenant-scoped.
Use bounded date ranges and server-side aggregation.
Add cross-tenant leakage tests.
Use accessible responsive charts or tables.
```

Commit.

## Prompt 21.3 — Superadmin reports

```text
Implement only approved platform-level and per-salon reports for SUPERADMIN.

Do not expose unnecessary customer personal data.
Protect expensive queries.
Add date-range validation, pagination where required, and audit access if approved.
```

Commit.

---

# 22. Audit Logs

## Prompt 22.1

```text
Implement the authorized audit-log viewer.

Requirements:
- immutable source records;
- SUPERADMIN platform scope;
- optionally SALON_ADMIN own-salon scope only if approved;
- filters;
- pagination;
- actor/action/target/tenant/time;
- privacy-safe metadata;
- no secrets, tokens, passwords, or excessive personal data;
- tenant-safe queries;
- export disabled unless separately approved.

Add role and tenant tests.
```

Commit.

---

# 23. Notifications

## Prompt 23.1 — Notification event contracts

```text
Do not add a queue yet.

Define notification event contracts and templates for approved reservation events:
- created;
- pending;
- confirmed;
- rejected;
- rescheduled;
- cancelled;
- reminder if approved.

Ensure templates contain no unnecessary sensitive data.
Define retry and idempotency requirements.
```

## Prompt 23.2 — Delivery implementation

```text
Implement the smallest approved notification delivery mechanism.

Keep provider integration behind an interface.
Use background processing only if required by the approved architecture.
Do not block reservation transactions on external delivery.
Record safe delivery status.
Do not log full message secrets or tokens.
```

Commit.

---

# 24. Full UX Audit

## Prompt 24.1 — Public/customer

Fresh session:

```text
Use the ui-reviewer subagent and apple-inspired-luxury-web skill.

Audit:
- home;
- discovery;
- salon detail;
- authentication;
- booking;
- customer profile;
- customer reservations.

Do not modify code.

Review at:
- 320px;
- 375px;
- 768px;
- 1024px;
- 1440px.

Check:
- modern luxurious simple direction;
- visual consistency;
- information hierarchy;
- booking clarity;
- keyboard;
- focus;
- form errors;
- lost-slot recovery;
- long content;
- loading/empty/error/success;
- performance risks;
- generic AI design patterns.

Return prioritized findings only.
```

## Prompt 24.2 — Dashboards

```text
Audit:
- SUPERADMIN;
- SALON_ADMIN;
- SALON_MANAGER.

Focus on operational efficiency, permission-appropriate actions,
mobile alternatives to tables, filters, destructive confirmations,
empty states, accessibility, and responsive behavior.

Do not modify code.
Return prioritized findings only.
```

Fix findings in small groups and commit each group.

---

# 25. Full Security Audit

## Prompt 25.1 — Read-only audit

Fresh session:

```text
Use the security-reviewer subagent and security-review skill.

Perform a read-only security audit of the complete repository.

Prioritize:
1. tenant escape;
2. broken access control;
3. customer ownership;
4. role escalation;
5. mass assignment;
6. reservation race conditions;
7. session security;
8. reset/invitation replay;
9. CSRF;
10. XSS;
11. injection;
12. unsafe uploads;
13. cache leakage;
14. domain/subdomain attacks;
15. report/export leakage;
16. sensitive logging;
17. secrets;
18. rate limiting;
19. dependency risk.

For every finding provide:
- ID;
- severity;
- confidence;
- attack scenario;
- affected file;
- evidence;
- smallest remediation;
- regression test.

Do not modify code.
Do not report speculative issues without evidence.
```

## Prompt 25.2 — Remediate critical/high

One fresh session for each finding or tightly coupled group:

```text
Fix only security finding [ID].

First add the regression test when practical.
Make the smallest safe change.
Do not refactor unrelated code.
Run focused tests.
Update the audit record.
```

Commit each fix separately.

## Prompt 25.3 — Medium/low review

```text
Group only closely related medium/low findings.
Do not mix unrelated security changes.
Apply approved fixes and tests.
```

---

# 26. Full Permission Audit

## Prompt 26.1

```text
Use security-reviewer and test-engineer subagents.

Build and verify an action matrix for every protected API operation:

- SUPERADMIN;
- SALON_ADMIN same salon;
- SALON_ADMIN other salon;
- SALON_MANAGER same salon;
- SALON_MANAGER other salon;
- CUSTOMER owner;
- CUSTOMER non-owner;
- unauthenticated;
- suspended user;
- inactive membership.

Trace:
route
→ authentication
→ policy
→ tenant scope
→ database query
→ response.

Flag:
- missing checks;
- inconsistent policies;
- plain-ID queries;
- client-controlled tenant scope;
- UI-only restrictions;
- missing denial tests.

Do not modify code.
```

Fix findings in small commits.

---

# 27. Validation Audit

## Prompt 27.1

```text
Use validation-contract skill.

Audit every external trust boundary:
- route params;
- query params;
- JSON bodies;
- forms;
- headers used by business logic;
- environment variables;
- file uploads;
- imports;
- webhook-like callbacks if any.

For each field check:
- required/optional/nullable;
- trim/normalization;
- length/range;
- enum;
- unknown-field rejection;
- cross-field validation;
- database constraint;
- user error;
- authorization relevance.

Do not modify code.
Return missing or inconsistent validation only.
```

Fix by module, one commit per module.

---

# 28. Test Completion

## Prompt 28.1 — Test gap analysis

```text
Use test-engineer.

Do not modify code.

Map approved acceptance criteria and security threats to existing tests.

Find missing:
- unit;
- integration;
- database;
- authorization;
- tenant isolation;
- concurrency;
- Playwright;
- accessibility smoke;
- responsive viewport;
- production build checks.

Prioritize only meaningful risk-based gaps.
Do not target arbitrary coverage percentages.
```

## Prompt 28.2 — Fill gaps

Implement gaps in small domain groups:

```text
Implement only the approved missing tests for [MODULE].
Do not change production behavior unless a test exposes a confirmed defect.
```

---

# 29. Performance Review

## Prompt 29.1 — Measure first

```text
Review production performance without changing framework.

Inspect:
- public JavaScript;
- Client Component boundaries;
- request waterfalls;
- image sizing;
- font loading;
- large dependencies;
- database query plans where available;
- N+1 patterns;
- pagination;
- report query limits;
- private/public caching;
- bundle sizes;
- Core Web Vitals instrumentation.

Do not make speculative micro-optimizations.
Return measured or evidence-based findings.
```

## Prompt 29.2 — Optimize

One finding per session:

```text
Fix only performance finding [ID].
Preserve behavior and security.
Add a measurement or regression check.
Do not replace Next.js.
```

---

# 30. Production Readiness

## Prompt 30.1 — Operations documents

```text
Execute only Phase 14 production-readiness documentation.

Create:
- deployment;
- environment variables;
- migration procedure;
- rollback;
- backup and restore;
- incident response;
- monitoring;
- release checklist.

Target the selected deployment environment only.
Do not document multiple hypothetical clouds.
```

## Prompt 30.2 — Production configuration review

```text
Review and implement production-safe configuration for:
- cookies;
- HTTPS assumptions;
- trusted proxies;
- CORS;
- CSRF;
- security headers;
- CSP;
- rate limits;
- logs;
- health/readiness;
- graceful shutdown;
- database connections;
- migration execution;
- secrets;
- image domains;
- caching;
- private no-store routes;
- error responses.

Do not deploy.
Add tests where practical.
```

## Prompt 30.3 — Release candidate gate

```text
Run the complete release candidate quality gate.

Required:
- clean install;
- formatting;
- lint;
- strict type check;
- unit tests;
- integration tests;
- database tests;
- authorization tests;
- tenant tests;
- concurrency tests;
- Playwright desktop;
- Playwright mobile;
- accessibility smoke;
- production builds;
- migration from an empty database;
- migration from the latest previous schema if available;
- dependency and secret scanning configured by the project.

Do not claim success for commands not run.
Do not suppress failures.

Return:
- passed commands;
- failed commands;
- blockers;
- critical/high security status;
- release recommendation.
```

---

# 31. Final Independent Review

## Prompt 31.1

Start a fresh context:

```text
Read:
- product acceptance criteria;
- role-permission matrix;
- architecture;
- threat model;
- final security audit;
- release candidate results.

Sample the implementation rather than rereading every generated file.

Independently evaluate whether Salonomia is ready for controlled staging.

Check:
- all four roles;
- tenant isolation;
- customer booking;
- manager operations;
- salon admin operations;
- superadmin operations;
- validation;
- responsive UX;
- accessibility;
- security;
- concurrency;
- observability;
- rollback.

Return one verdict:
- READY FOR STAGING;
- READY WITH NON-BLOCKING CONDITIONS;
- NOT READY.

List only evidence-backed blockers and conditions.
Do not modify code.
```

---

# 32. Staging Smoke-Test Prompt

After deploying manually to staging:

```text
Create a staging smoke-test checklist and Playwright suite for:

SUPERADMIN:
- login;
- create salon;
- assign salon admin;
- manage subdomain;
- suspend/restore salon.

SALON_ADMIN:
- login;
- edit salon;
- create employee;
- create service;
- assign service;
- create schedule;
- invite manager;
- view report.

SALON_MANAGER:
- login;
- view reservations;
- create manual booking;
- confirm;
- reschedule;
- cancel;
- complete.

CUSTOMER:
- discover salon;
- select service;
- choose any stylist;
- choose slot;
- authenticate without losing draft;
- book;
- view own reservation;
- reschedule or cancel when eligible.

SECURITY:
- each role attempts one forbidden cross-role action;
- salon admin and manager attempt cross-tenant access;
- customer attempts another reservation ID;
- two clients attempt the same slot concurrently.

Do not use production data.
```

---

# 33. Daily Working Prompt

Use this for normal work:

```text
Read CLAUDE.md and only files relevant to this task.

Task:
[ONE NARROW TASK]

Actor:
[ROLE]

Tenant scope:
[SCOPE]

Acceptance criteria:
- [...]
- [...]

Before coding:
- identify server authorization;
- identify tenant/owner scoping;
- identify validation;
- identify UI states;
- identify tests;
- propose a short file-level plan.

Do not code until the plan is complete.
Do not broaden scope.
```

After approving:

```text
Implement the approved plan only.

Apply the relevant project skills.
Keep the diff small.
Do not refactor unrelated files.
Run focused checks.

Return only:
1. result;
2. files changed;
3. commands and outcomes;
4. security/tenant checks;
5. remaining risks.
```

---

# 34. Token Emergency Mode

When Claude Pro usage is running low:

```text
TOKEN-SAVING MODE

Do not use subagents.
Do not perform broad repository review.
Do not rewrite documentation.
Do not explain code.
Read only explicitly listed files.
Implement only the named function/component/endpoint.
Run only focused tests.
Return at most 12 lines.
```

Use local tooling for:

- formatting;
- linting;
- type checking;
- test execution;
- dependency commands;
- database migration execution.

Do not ask Claude to describe outputs you can read directly.

---

# 35. Do Not Do These

Never use prompts such as:

```text
Build the whole project.
Finish the remaining application.
Make everything secure.
Make the UI beautiful.
Check the entire codebase after every change.
Rewrite this module in the best way.
```

These prompts consume context, broaden scope, and produce unreviewable changes.

Never:

- keep one session for the whole project;
- accept a large untested diff;
- combine auth, database, dashboard, and booking in one prompt;
- allow Claude to invent permissions;
- let UI visibility replace backend authorization;
- postpone validation and security until the end;
- start reports before reservation correctness;
- optimize before measuring;
- change framework due to one slow page;
- let an agent silently change the schema or public API.

---

# 36. Final Build Order Summary

```text
1. Claude governance and skills
2. Product specification
3. Architecture and threat model
4. Repository foundation
5. Design foundations
6. Shared design system
7. Database model
8. Authentication
9. Authorization and tenant isolation
10. Superadmin salon management
11. Salon admin employees
12. Salon admin services
13. Scheduling
14. Reservation state model
15. Availability engine
16. Customer booking transaction
17. Manager manual booking
18. Reservation transitions
19. Manager dashboard
20. Public customer website
21. Customer booking UI
22. Customer reservation management
23. Salon admin reservation management
24. Manager membership management
25. Reports
26. Audit logs
27. Notifications
28. Full UX audit
29. Full security audit
30. Permission audit
31. Validation audit
32. Test completion
33. Performance review
34. Production readiness
35. Release candidate gate
36. Independent staging decision
37. Staging smoke tests
```

Do not skip the order unless an approved ADR or product decision requires it.
