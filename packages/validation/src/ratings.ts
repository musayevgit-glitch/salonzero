import { z } from 'zod';

// A rating is always keyed to a reservation the server re-verifies as the caller's own and as
// COMPLETED. `salonId` is deliberately absent: it is copied from the reservation server-side, so
// a client cannot attribute a rating to a salon it did not visit.
export const createRatingSchema = z
  .object({
    reservationId: z.string().uuid(),
    stars: z.coerce.number().int().min(1).max(5),
    comment: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .strict();

export type CreateRatingInput = z.infer<typeof createRatingSchema>;

// Salon-admin listing. `stars` narrows to one bucket; omitted means all.
export const listSalonRatingsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    stars: z.coerce.number().int().min(1).max(5).optional(),
  })
  .strict();

export type ListSalonRatingsQuery = z.infer<typeof listSalonRatingsQuerySchema>;
