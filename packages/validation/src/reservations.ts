import { z } from 'zod';
import { emailSchema } from './auth';

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
// customerFullName is always required (even when the customer already has an account) so the
// service never has to branch its validation on whether the account exists — that branch was a
// cross-tenant account-existence oracle (a manager could learn whether any email on the platform,
// including another salon's customer, has an account, from the shape of the error alone).
export const createManualReservationSchema = z
  .object({
    customerEmail: emailSchema,
    customerFullName: z.string().trim().min(1).max(200),
    serviceId: z.string().uuid(),
    employeeId: z.string().uuid().nullable().optional(),
    startAt: z.string().datetime(),
    customerNote: z.string().trim().min(1).max(1000).optional(),
    idempotencyKey: z.string().uuid().optional(),
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

// Customer-facing reschedule has no employeeId — a customer cannot change stylist, only time
// (docs/architecture/reservation-state-machine.md). Omitting the field entirely (rather than
// accepting-and-ignoring it) avoids a confusing 200 response that silently drops a customer's
// attempt to also change stylist.
export const customerRescheduleReservationSchema = z
  .object({ startAt: z.string().datetime() })
  .strict();
export type CustomerRescheduleReservationInput = z.infer<
  typeof customerRescheduleReservationSchema
>;

const RESERVATION_STATUS_VALUES = [
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED_BY_CUSTOMER',
  'CANCELLED_BY_SALON',
  'CHECKED_IN',
  'COMPLETED',
  'NO_SHOW',
] as const;

// Staff-facing reservation list (dashboard: today/day/week views, filters, search). `from`/`to`
// bound the query by `startAt`; both optional so "today" can be expressed by the caller computing
// the salon-local day bounds and passing them explicitly (the server has no opinion on "today"
// without a client-supplied reference point — this schema only validates shape/bounds).
export const listSalonReservationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    status: z.enum(RESERVATION_STATUS_VALUES).optional(),
    employeeId: z.string().uuid().optional(),
    // Matches against the customer's name/email — never against internal fields.
    search: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .strict();
export type ListSalonReservationsQuery = z.infer<typeof listSalonReservationsQuerySchema>;
