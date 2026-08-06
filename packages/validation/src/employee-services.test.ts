import { describe, expect, it } from 'vitest';
import { assignEmployeeServiceSchema } from './employee-services';

describe('assignEmployeeServiceSchema', () => {
  it('accepts a valid serviceId', () => {
    const serviceId = '11111111-1111-1111-1111-111111111111';
    expect(assignEmployeeServiceSchema.parse({ serviceId })).toEqual({ serviceId });
  });

  it('rejects a missing serviceId', () => {
    expect(() => assignEmployeeServiceSchema.parse({})).toThrow();
  });

  it('rejects a malformed serviceId', () => {
    expect(() => assignEmployeeServiceSchema.parse({ serviceId: 'not-a-uuid' })).toThrow();
  });

  it('rejects forbidden fields', () => {
    const serviceId = '11111111-1111-1111-1111-111111111111';
    expect(() => assignEmployeeServiceSchema.parse({ serviceId, employeeId: 'forged' })).toThrow();
  });
});
