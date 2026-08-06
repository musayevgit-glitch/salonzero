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

// Explicit allowlist of editable fields — slug/subdomain/customDomain/status/id are never accepted
// here (slug rarely changes and would break existing links; subdomain is Section 11.5's job; status
// is Section 11.4's suspend/restore action, not a generic field edit).
export const updateSalonSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    timezone: z.string().trim().min(1).max(100).optional(),
    city: z.string().trim().min(1).max(100).nullable().optional(),
    description: z.string().trim().min(1).max(2000).nullable().optional(),
    addressLine: z.string().trim().min(1).max(300).nullable().optional(),
    phone: z.string().trim().min(1).max(30).nullable().optional(),
    email: z.string().trim().toLowerCase().email().max(254).nullable().optional(),
    genderFocus: z.enum(['WOMEN', 'MEN', 'UNISEX']).nullable().optional(),
    // Optimistic concurrency: the client echoes back the `updatedAt` it last read; a mismatch means
    // someone else changed the salon in between, and the update is rejected rather than silently
    // overwriting their change.
    expectedUpdatedAt: z.string().datetime().optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).some((key) => key !== 'expectedUpdatedAt'), {
    message: 'At least one editable field must be provided.',
  });
export type UpdateSalonInput = z.infer<typeof updateSalonSchema>;

// Suspend/restore (Section 11.4) — an optional reason, recorded on the audit event. No status field
// here: which action (suspend vs. restore) is determined by the route, never by a client-supplied
// status value.
export const salonLifecycleActionSchema = z
  .object({
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .strict();
export type SalonLifecycleActionInput = z.infer<typeof salonLifecycleActionSchema>;
