import { z } from 'zod';

/**
 * Shared server-side environment schema. apps/api validates its own process.env against this
 * (extended with API-only fields) at startup; failing fast beats a runtime null-reference later.
 */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;
