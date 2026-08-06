# ADR-0008: File storage — pluggable adapter, S3-compatible in production, local disk in dev

## Status

Accepted

## Decision

Introduce `packages/storage` exposing a single `StorageAdapter` interface (`createUploadTarget`,
`getObjectUrl`, `deleteObject`) with two implementations selected by `STORAGE_DRIVER`:

- `s3` (production default): S3-compatible object storage using presigned PUT uploads and presigned
  GET/public URLs, via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`. Matches the playbook's
  "S3-compatible object storage using signed uploads" requirement exactly.
- `local` (dev default, used when no S3 credentials are configured): stores objects under a git-ignored
  local directory. "Signed" upload/download URLs are short-lived HMAC-signed tokens verified by a
  dedicated API route, so the security properties (time-limited, unforgeable, ownership-checked) match
  the S3 case even though the transport differs.

All callers (the employee-portfolio feature and any future upload feature) depend only on the
`StorageAdapter` interface, never on a driver directly.

## Rationale

This environment has no Docker and no configured S3/MinIO credentials (documented in
`docs/implementation/progress.md`'s "Blockers / environment notes" — the same reason sessions use
Postgres instead of Redis). Blocking all upload work on provisioning real object storage would stall
Section 12.3 indefinitely; conversely, hand-rolling a "temporary" insecure local upload path would
violate the signed-upload requirement in the playbook and role-permission/threat-model documents, which
take precedence over implementation notes. A pluggable adapter behind one interface lets local
development and tests run against a real (if simpler) signed-upload flow today, while production only
needs an env var change plus real S3-compatible credentials to switch drivers — no code change, no
test rewrite.

## Alternatives considered

- Require Docker/MinIO for all local development: rejected — this environment cannot run Docker, and
  the playbook's own precedent (ADR-0003 sessions) already establishes "pragmatic local substitute
  behind the same interface" as the accepted pattern here.
- Store files directly in Postgres (bytea): rejected — the playbook explicitly specifies object
  storage, and large binary blobs in the primary transactional database hurt backup/restore and query
  performance.
- Skip signing locally (plain static-file serving): rejected — would leave local/dev and CI tests
  exercising a fundamentally different (unsigned, unauthenticated) code path than production, defeating
  the purpose of testing upload authorization at all.

## Consequences

- New package `packages/storage` with `StorageAdapter`, `S3StorageAdapter`, `LocalDiskStorageAdapter`,
  and a factory that reads `STORAGE_DRIVER` (defaults to `local` when unset, matching the "no Docker in
  this environment" default already used for sessions/DB).
- Local driver needs one API route (e.g. `GET /uploads/:token`) to serve object bytes after verifying
  the HMAC token's expiry and target object; this route is new attack surface and gets the same
  cross-tenant/IDOR-style tests as everything else.
- `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` are added as dependencies of
  `packages/storage` but are only imported/instantiated when `STORAGE_DRIVER=s3`, so local dev never
  needs AWS credentials.
- Uploaded files are validated (MIME allowlist, size limit, no executable/SVG) by the API before a
  storage target is even created, not left to the storage layer — the adapter only handles bytes.
