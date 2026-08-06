import { z } from 'zod';

// Self-service profile editing (Section 17.3) — explicit allowlist, `.strict()` so email/password/
// status/isSuperadmin/id can never reach the service via this schema (mass-assignment is
// structurally impossible, not just rejected). Email is deliberately excluded: changing it needs
// its own re-verification flow, not a plain profile-field update — out of scope for this slice.
export const updateCustomerProfileSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    marketingConsent: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required.' });
export type UpdateCustomerProfileInput = z.infer<typeof updateCustomerProfileSchema>;
