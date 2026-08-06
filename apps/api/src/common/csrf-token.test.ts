import { afterEach, describe, expect, it, vi } from 'vitest';

describe('csrf token cookie config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses the __Host- cookie prefix in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();

    const { CSRF_COOKIE_NAME } = await import('./csrf-token');

    expect(CSRF_COOKIE_NAME).toBe('__Host-csrfToken');
  });
});
