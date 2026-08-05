import { z } from 'zod';
import { baseEnvSchema } from '@salonomia/validation';

/**
 * Extends the shared base schema with apps/api-only fields. Validated once at bootstrap
 * (see main.ts) so a missing/invalid env var fails startup instead of surfacing later as a
 * null-reference deep in a request handler.
 */
export const apiEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters'),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function validateApiEnv(raw: NodeJS.ProcessEnv): ApiEnv {
  return apiEnvSchema.parse(raw);
}
