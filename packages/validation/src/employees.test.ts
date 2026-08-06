import { describe, expect, it } from 'vitest';
import { listEmployeesQuerySchema } from './employees';

describe('listEmployeesQuerySchema', () => {
  it('defaults page/pageSize when omitted', () => {
    expect(listEmployeesQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('coerces isActive from string to boolean', () => {
    expect(listEmployeesQuerySchema.parse({ isActive: 'true' }).isActive).toBe(true);
    expect(listEmployeesQuerySchema.parse({ isActive: 'false' }).isActive).toBe(false);
  });

  it('rejects an invalid isActive value', () => {
    expect(() => listEmployeesQuerySchema.parse({ isActive: 'yes' })).toThrow();
  });

  it('rejects unknown query params', () => {
    expect(() => listEmployeesQuerySchema.parse({ sort: 'name' })).toThrow();
  });

  it('caps pageSize at 100', () => {
    expect(() => listEmployeesQuerySchema.parse({ pageSize: 1000 })).toThrow();
  });
});
