import { z } from 'zod';

// Shared between apps/api (server-side enforcement) and apps/web/apps/dashboard (client-side UX only —
// the server copy is authoritative per CLAUDE.md).

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
// Length only here; strength/complexity is enforced by argon2 hashing cost, not a regex policy.
const passwordSchema = z.string().min(8).max(200);

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    fullName: z.string().trim().min(1).max(200),
  })
  .strict();
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(200),
  })
  .strict();
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1).max(500),
    password: passwordSchema,
  })
  .strict();
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const acceptInvitationSchema = z
  .object({
    token: z.string().min(1).max(500),
    fullName: z.string().trim().min(1).max(200).optional(),
    password: passwordSchema.optional(),
  })
  .strict();
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

// Safe-redirect allowlist: internal path only, never an absolute/protocol-relative URL.
export function isSafeRedirectPath(path: string): boolean {
  return /^\/(?!\/)/.test(path);
}
