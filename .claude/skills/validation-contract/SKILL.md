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
