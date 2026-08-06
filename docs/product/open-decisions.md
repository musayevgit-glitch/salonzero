# Open Business Decisions

Ordinary technical details are resolved with safe conventional defaults per `CLAUDE.md` and recorded as
ADRs when architecturally meaningful. The items below change customer-visible behavior or business policy
and require owner input before the relevant milestone:

1. **Guest booking** — the reservation flow doc allows guest booking "only by product decision." Default
   assumed for MVP: **not allowed**, authentication required before final confirmation. Confirm or override.
2. **SALON_MANAGER invite permission** — playbook says SALON_ADMIN may invite/remove SALON_MANAGER "if
   enabled by policy." Default assumed: **enabled**. Confirm or override.
3. **Default booking policy per new salon** — auto-confirm vs. manual approval. Default assumed:
   **manual approval** (safer default, avoids double-booking exposure until a salon opts in to auto-confirm).
4. **Multi-service reservations** — playbook flags this as MVP-limitable. Default assumed: **one service
   per reservation** in MVP.
5. **OAuth/social login provider(s)** — reservation flow mentions "Google or another approved provider."
   No provider chosen yet; default MVP scope: **email/password only**, OAuth deferred.
6. **Salon-wide closures** — Prompt 14.3 asks for "employee time off and salon closure periods," but the
   approved data model (Section 8) only has a per-employee `TimeOff` table, no salon-wide closure model.
   Adding one is a real schema/architecture decision (new table, cross-cutting effect on every
   employee's availability, its own reservation-conflict policy) rather than a safe default, so it was
   deferred rather than improvised — confirmed with the user during Section 14.3. Default assumed:
   **out of MVP scope for now**; needs its own ADR and data-model update before implementation.

Each item will be finalized (owner decision or default confirmed) before the milestone that implements it,
and recorded here with a resolution date.
