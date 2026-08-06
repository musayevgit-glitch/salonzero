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

// photoUrl is deliberately excluded here — Section 12.3 (portfolio/uploads) owns how a photo gets
// attached, via a signed-upload flow, not a client-supplied arbitrary URL.
export const createEmployeeSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200),
    bio: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    bio: z.string().trim().min(1).max(2000).nullable().optional(),
    expectedUpdatedAt: z.string().datetime().optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).some((key) => key !== 'expectedUpdatedAt'), {
    message: 'At least one editable field must be provided.',
  });
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
