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
  // Comma-separated allowlist — CORS must never wildcard while credentials are enabled
  // (docs/security/security-requirements.md).
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
  // SEC-005: number of trusted proxy hops in front of this process (typically 1 for a single LB).
  // Set to 0 in development (direct connections). Never use `true` — that trusts the entire
  // X-Forwarded-For chain, which is attacker-controlled.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  // SEC-006: auth route throttle limit goes through env validation so a non-numeric value (typo,
  // template artifact) causes a startup failure rather than silently disabling rate limiting.
  AUTH_THROTTLE_LIMIT: z.coerce.number().int().min(1).max(10_000).default(10),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function validateApiEnv(raw: NodeJS.ProcessEnv): ApiEnv {
  return apiEnvSchema.parse(raw);
}
