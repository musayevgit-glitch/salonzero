import { z } from 'zod';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validationBadRequest } from './validation-error';

describe('validationBadRequest', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('SEC-023: does not echo unknown key names in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const result = z.object({ email: z.string().email() }).strict().safeParse({
      email: 'ok@example.com',
      isSuperadmin: true,
    });
    if (result.success) throw new Error('expected validation failure');

    const response = validationBadRequest(result.error).getResponse();

    expect(JSON.stringify(response)).not.toContain('isSuperadmin');
    expect(response).toEqual({ message: 'Invalid request body.' });
  });
});
