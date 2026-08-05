# Error Handling

- NestJS global exception filter maps internal errors to a safe, generic response; stack traces and
  internal messages never reach the client.
- Authorization failures return 401 (unauthenticated) or 404 (authenticated but not authorized/owns the
  resource) — never 403 with details that confirm another tenant's resource exists.
- Validation failures (Zod/class-validator) return field-level messages safe to show the user.
- Reservation conflicts return a privacy-safe message (see reservation flow doc §12) — no details about
  the other booking.
- All unhandled errors are logged server-side with a correlation ID; that ID (not the error) is returned
  to the client for support lookup.
