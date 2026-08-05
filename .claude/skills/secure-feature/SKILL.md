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
