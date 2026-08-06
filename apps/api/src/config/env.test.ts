import { describe, expect, it } from 'vitest';
import { validateApiEnv } from './env';

const validEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  SESSION_SECRET: 'a'.repeat(32),
};

describe('validateApiEnv', () => {
  it('accepts a valid environment and defaults PORT', () => {
    const result = validateApiEnv(validEnv);
    expect(result.PORT).toBe(4000);
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => validateApiEnv({ ...validEnv, DATABASE_URL: '' })).toThrow();
  });

  it('rejects a short SESSION_SECRET', () => {
    expect(() => validateApiEnv({ ...validEnv, SESSION_SECRET: 'short' })).toThrow();
  });

  // SEC-006 regression: a non-numeric AUTH_THROTTLE_LIMIT must fail validation at startup rather
  // than silently producing NaN and disabling rate limiting.
  it('SEC-006: rejects a non-numeric AUTH_THROTTLE_LIMIT', () => {
    expect(() => validateApiEnv({ ...validEnv, AUTH_THROTTLE_LIMIT: 'abc' })).toThrow();
  });

  it('SEC-006: accepts a numeric AUTH_THROTTLE_LIMIT', () => {
    const result = validateApiEnv({ ...validEnv, AUTH_THROTTLE_LIMIT: '5' });
    expect(result.AUTH_THROTTLE_LIMIT).toBe(5);
  });

  it('defaults AUTH_THROTTLE_LIMIT to 10 when not set', () => {
    const result = validateApiEnv(validEnv);
    expect(result.AUTH_THROTTLE_LIMIT).toBe(10);
  });
});
