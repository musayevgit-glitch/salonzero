import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok status', () => {
    expect(new HealthController().check()).toEqual({ status: 'ok' });
  });
});
