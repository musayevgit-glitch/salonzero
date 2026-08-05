# Content Style

- Plain, direct, warm — not salesy. "Book your appointment," not "Unlock your beauty journey."
- Errors state what happened and what to do next; never blame the user, never show raw internal errors
  (see `docs/architecture/error-handling.md`).
- Empty states explain why the view is empty and offer the one relevant next action (e.g. "No upcoming
  reservations — browse salons").
- Status/permission language: "Pending salon confirmation," "You don't have access to this page" — never
  vague codes like "Error 403" as the only message.
- Bilingual-ready: no string concatenation that breaks word order in Azerbaijani; all user-facing copy
  goes through a single content layer (i18n mechanism selected when Phase 10 needs it) rather than
  scattered inline strings, so translation is additive, not a rewrite.
- Numbers: prices and durations always show units explicitly (currency, "45 min"), never bare numbers.
