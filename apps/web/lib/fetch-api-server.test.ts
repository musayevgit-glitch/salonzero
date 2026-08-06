import { describe, expect, it } from 'vitest';
import { buildApiServerFetchInit } from './fetch-api-server';

describe('buildApiServerFetchInit', () => {
  it('SEC-018: always disables fetch caching, even if the caller asks for force-cache', () => {
    const init = buildApiServerFetchInit(
      { cache: 'force-cache', headers: { Accept: 'application/json' } },
      { name: 'connect.sid', value: 'session-value' },
    );

    expect(init.cache).toBe('no-store');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Cookie: 'connect.sid=session-value',
      Accept: 'application/json',
    });
  });
});
