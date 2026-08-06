import { z } from 'zod';

// Customer-facing booking creation. salonId/serviceId/employeeId here are business inputs (which
// salon/service/stylist the customer wants), not an authorization scope — the server still
// verifies each one exists, is active, and belongs together before trusting any of it (see
// apps/api/src/reservations/reservations.service.ts). customerId is never accepted from the body;
// it always comes from the session.
export const createReservationSchema = z
  .object({
    salonId: z.string().uuid(),
    serviceId: z.string().uuid(),
    // Omitted or null = "any suitable stylist" (server picks an eligible, available employee).
    employeeId: z.string().uuid().nullable().optional(),
    startAt: z.string().datetime(),
    customerNote: z.string().trim().min(1).max(1000).optional(),
    // Required: client-generated key for double-submit protection (Section 15.1's idempotency
    // requirement). A UUID is a reasonable, simple shape to require without prescribing a specific
    // generation scheme.
    idempotencyKey: z.string().uuid(),
  })
  .strict();
export type CreateReservationInput = z.infer<typeof createReservationSchema>;

// Manager/admin manual booking (Section 15.4) — no salonId (comes from the authorized route
// context, never client-chosen), no price/duration/status fields at all.
export const createManualReservationSchema = z
  .object({
    customerEmail: z.string().trim().email(),
    customerFullName: z.string().trim().min(1).max(200).optional(),
    serviceId: z.string().uuid(),
    employeeId: z.string().uuid().nullable().optional(),
    startAt: z.string().datetime(),
    customerNote: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();
export type CreateManualReservationInput = z.infer<typeof createManualReservationSchema>;

export const reservationReasonSchema = z
  .object({ reason: z.string().trim().min(1).max(500).optional() })
  .strict();
export type ReservationReasonInput = z.infer<typeof reservationReasonSchema>;

export const rescheduleReservationSchema = z
  .object({
    startAt: z.string().datetime(),
    employeeId: z.string().uuid().optional(),
  })
  .strict();
export type RescheduleReservationInput = z.infer<typeof rescheduleReservationSchema>;
