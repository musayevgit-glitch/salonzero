import { describe, expect, it } from 'vitest';
import { baseEnvSchema } from './env';

describe('baseEnvSchema', () => {
  it('defaults NODE_ENV to development', () => {
    expect(baseEnvSchema.parse({}).NODE_ENV).toBe('development');
  });

  it('rejects an invalid NODE_ENV value', () => {
    expect(() => baseEnvSchema.parse({ NODE_ENV: 'bogus' })).toThrow();
  });
});
