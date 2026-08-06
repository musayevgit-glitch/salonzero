import { z } from 'zod';

export const listEmployeesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v ? v : undefined)),
    isActive: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
  })
  .strict();
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
