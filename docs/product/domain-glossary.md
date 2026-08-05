# Domain Glossary

- **Salon** — a tenant business entity; owns employees, services, schedules, reservations, customers.
- **SalonMembership** — links a User to a Salon with a role (SALON_ADMIN or SALON_MANAGER).
- **Employee / Stylist** — a person performing services at a salon; has eligible services and a working schedule.
- **Service** — a bookable offering with price, duration, optional buffer, belonging to one salon.
- **ServiceCategory** — grouping for services within a salon.
- **WorkingSchedule / Break / TimeOff** — employee availability inputs used by the availability engine.
- **BookingPolicy** — salon-level rules: auto-confirm vs. manual approval, min notice, max horizon,
  cancellation/reschedule windows.
- **Reservation** — a booking of one service, one employee (or auto-assigned), one customer, at a salon,
  for a specific UTC time range.
- **ReservationStatusHistory** — immutable trail of status transitions for a reservation.
- **Availability** — the set of bookable time slots computed server-side from schedule, breaks, time-off,
  service duration/buffer, existing reservations, and booking policy.
- **AuditLog** — immutable record of security-sensitive or business-critical actions (actor, action, target,
  tenant, timestamp, safe metadata).
- **Notification** — an event-driven message to a user about reservation lifecycle changes.
- **CUSTOMER identity** — always derived from the authenticated session, never from client input.
