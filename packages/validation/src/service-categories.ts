import { z } from 'zod';

// isActive is deliberately excluded from create/update — it's only settable via the dedicated
// activate/deactivate actions, matching the employee-profile pattern (packages/validation/src/
// employees.ts) for consistent audit action names and to keep the write surface allowlisted.
export const createServiceCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
  })
  .strict();
export type CreateServiceCategoryInput = z.infer<typeof createServiceCategorySchema>;

export const updateServiceCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    expectedUpdatedAt: z.string().datetime().optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).some((key) => key !== 'expectedUpdatedAt'), {
    message: 'At least one editable field must be provided.',
  });
export type UpdateServiceCategoryInput = z.infer<typeof updateServiceCategorySchema>;

export const reorderServiceCategoriesSchema = z
  .object({
    categoryIds: z.array(z.string().uuid()).min(1).max(200),
  })
  .strict();
export type ReorderServiceCategoriesInput = z.infer<typeof reorderServiceCategoriesSchema>;
