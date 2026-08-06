import { z } from 'zod';

// Money is Int minor-currency-units + currency string, never float (docs/architecture/data-model.md).
export const MAX_PRICE_MINOR_UNITS = 100_000_00; // 100,000.00 in a 2-decimal currency
export const MIN_DURATION_MINUTES = 5;
export const MAX_DURATION_MINUTES = 480; // 8 hours
export const MIN_BUFFER_MINUTES = 0;
export const MAX_BUFFER_MINUTES = 120;

const priceAmount = z.number().int().min(0).max(MAX_PRICE_MINOR_UNITS);
const currency = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, 'currency must be a 3-letter ISO 4217 code (e.g. USD).');
const durationMinutes = z.number().int().min(MIN_DURATION_MINUTES).max(MAX_DURATION_MINUTES);
const bufferMinutes = z.number().int().min(MIN_BUFFER_MINUTES).max(MAX_BUFFER_MINUTES);

export const listServicesQuerySchema = z
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
    categoryId: z.string().uuid().optional(),
  })
  .strict();
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;

// isActive is deliberately excluded — only settable via the dedicated activate/deactivate actions,
// matching the employee-profile/service-category pattern (consistent audit action names, allowlisted
// write surface).
export const createServiceSchema = z
  .object({
    categoryId: z.string().uuid().nullable().optional(),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(2000).optional(),
    priceAmount,
    currency,
    durationMinutes,
    bufferMinutes: bufferMinutes.default(0),
  })
  .strict();
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z
  .object({
    categoryId: z.string().uuid().nullable().optional(),
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(2000).nullable().optional(),
    priceAmount: priceAmount.optional(),
    currency: currency.optional(),
    durationMinutes: durationMinutes.optional(),
    bufferMinutes: bufferMinutes.optional(),
    expectedUpdatedAt: z.string().datetime().optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).some((key) => key !== 'expectedUpdatedAt'), {
    message: 'At least one editable field must be provided.',
  });
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
