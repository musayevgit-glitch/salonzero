import { z } from 'zod';

export const salonStatusSchema = z.enum(['ACTIVE', 'SUSPENDED']);

export const listSalonsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v ? v : undefined)),
    status: salonStatusSchema.optional(),
  })
  .strict();
export type ListSalonsQuery = z.infer<typeof listSalonsQuerySchema>;
