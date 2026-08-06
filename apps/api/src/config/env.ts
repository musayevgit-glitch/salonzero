import { z } from 'zod';
import { baseEnvSchema } from '@salonomia/validation';

const PLACEHOLDER_SECRETS = new Set([
  'replace-with-a-long-random-string',
  'dev-only-local-storage-signing-secret-do-not-use-in-prod',
]);

const secretSchema = z.string().min(32, 'Secret must be at least 32 characters');

/**
 * Extends the shared base schema with apps/api-only fields. Validated once at bootstrap
 * (see main.ts) so a missing/invalid env var fails startup instead of surfacing later as a
 * null-reference deep in a request handler.
 */
const apiEnvObjectSchema = baseEnvSchema.extend({
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    SESSION_SECRET: secretSchema,
    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    LOCAL_STORAGE_SIGNING_SECRET: secretSchema.optional(),
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

export const apiEnvSchema = apiEnvObjectSchema
  .superRefine((env, ctx) => {
    if (env.STORAGE_DRIVER === 'local' && !env.LOCAL_STORAGE_SIGNING_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['LOCAL_STORAGE_SIGNING_SECRET'],
        message: 'LOCAL_STORAGE_SIGNING_SECRET is required when STORAGE_DRIVER=local',
      });
    }

    if (env.NODE_ENV === 'production') {
      for (const origin of env.CORS_ORIGINS) {
        let parsed: URL;
        try {
          parsed = new URL(origin);
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['CORS_ORIGINS'],
            message: `CORS_ORIGINS contains an invalid origin: ${origin}`,
          });
          continue;
        }

        const hostname = parsed.hostname.toLowerCase();
        if (
          parsed.protocol !== 'https:' ||
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname === '::1'
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['CORS_ORIGINS'],
            message: 'Production CORS_ORIGINS must be HTTPS non-localhost origins',
          });
        }
      }

      for (const key of ['SESSION_SECRET', 'LOCAL_STORAGE_SIGNING_SECRET'] as const) {
        const value = env[key];
        if (value && PLACEHOLDER_SECRETS.has(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} must not use a placeholder value in production`,
          });
        }
      }
    }
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function validateApiEnv(raw: NodeJS.ProcessEnv): ApiEnv {
  return apiEnvSchema.parse(raw);
}

export function validateAuthThrottleLimit(raw: NodeJS.ProcessEnv): ApiEnv['AUTH_THROTTLE_LIMIT'] {
  return apiEnvObjectSchema.shape.AUTH_THROTTLE_LIMIT.parse(raw.AUTH_THROTTLE_LIMIT);
}
