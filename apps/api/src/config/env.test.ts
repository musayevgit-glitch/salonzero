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
});
