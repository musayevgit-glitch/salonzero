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

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens only.');

export const createSalonSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    // Optional — server derives one from `name` when omitted (docs/security/authorization.md-style
    // "server-derived, not client-trusted" applies to generated identifiers too).
    slug: slugSchema.optional(),
    timezone: z.string().trim().min(1).max(100),
    city: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    addressLine: z.string().trim().min(1).max(300).optional(),
    phone: z.string().trim().min(1).max(30).optional(),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
    genderFocus: z.enum(['WOMEN', 'MEN', 'UNISEX']).optional(),
    // The person invited to become this salon's first SALON_ADMIN.
    adminEmail: z.string().trim().toLowerCase().email().max(254),
  })
  .strict();
export type CreateSalonInput = z.infer<typeof createSalonSchema>;
