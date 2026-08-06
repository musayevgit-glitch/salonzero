import { z } from 'zod';

export const listCustomerReservationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    status: z
      .enum(['PENDING', 'CONFIRMED', 'CANCELLED_BY_CUSTOMER', 'CANCELLED_BY_SALON', 'REJECTED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW'])
      .optional(),
  })
  .strict();

export type ListCustomerReservationsQuery = z.infer<typeof listCustomerReservationsQuerySchema>;
