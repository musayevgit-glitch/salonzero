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
