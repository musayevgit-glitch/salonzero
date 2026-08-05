# Salonomia Project Instructions

Multi-tenant salon discovery, management, and reservation platform.
Roles: SUPERADMIN, SALON_ADMIN, SALON_MANAGER, CUSTOMER.

Authoritative precedence when documents conflict:
1. approved security requirements and threat model;
2. approved Architecture Decision Records;
3. approved role-permission matrix;
4. docs/Salonomia_Final_Claude_Code_Playbook.md;
5. feature-specific product specifications;
6. implementation notes.

## Working style
- Read relevant docs and existing code before changing anything.
- Work on one approved milestone/section at a time; do not implement future milestones.
- Prefer small, reviewable diffs. Never rewrite unrelated files.
- Never silently change architecture, dependencies, or public contracts.
- Ask only when a missing decision creates a security or data-loss risk; otherwise choose the safest conventional default and record it in an ADR.
- Keep responses compact: result, files changed, tests, security checks, remaining risks, next command.
- Do not paste entire files unless requested.

## Quality gates
A task is not complete until:
- code compiles, lints, and type-checks;
- relevant unit/integration/E2E tests pass;
- authorization is server-side and tenant isolation is tested;
- validation exists at trust boundaries;
- accessibility and responsive behavior are checked for UI work;
- documentation is updated.

## Security
- Deny by default.
- Never trust client-supplied identity, role, salon ID, price, duration, or status.
- Scope every tenant-owned query by the authorized salon ID; never query by ID first and authorize after.
- Add a regression test for every security fix.
- Never log secrets, tokens, passwords, or unnecessary personal data.
- Do not weaken security controls to make tests pass.

## Database
- All tenant-owned records must have an explicit tenant relationship.
- Use transactions for multi-step state changes.
- Enforce invariants with database constraints where possible.
- Migrations must be reversible or accompanied by a rollback plan.
- Seed data must be obviously non-production.

## UI/UX
- Mobile-first, fully responsive, keyboard accessible, visible focus states.
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
