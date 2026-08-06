import { describe, expect, it } from 'vitest';
import { createEmployeeSchema, listEmployeesQuerySchema, updateEmployeeSchema } from './employees';

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

describe('createEmployeeSchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(createEmployeeSchema.parse({ fullName: 'Jane Stylist' })).toEqual({
      fullName: 'Jane Stylist',
    });
  });

  it('rejects a missing fullName', () => {
    expect(() => createEmployeeSchema.parse({ bio: 'Great' })).toThrow();
  });

  it('rejects forbidden/protected fields (salonId, id, isActive, photoUrl)', () => {
    expect(() => createEmployeeSchema.parse({ fullName: 'X', salonId: 'forged' })).toThrow();
    expect(() => createEmployeeSchema.parse({ fullName: 'X', id: 'forged' })).toThrow();
    expect(() => createEmployeeSchema.parse({ fullName: 'X', isActive: false })).toThrow();
    expect(() =>
      createEmployeeSchema.parse({ fullName: 'X', photoUrl: 'https://evil.example.com/x' }),
    ).toThrow();
  });
});

describe('updateEmployeeSchema', () => {
  it('accepts a partial update with a single field', () => {
    expect(updateEmployeeSchema.parse({ fullName: 'New Name' })).toEqual({ fullName: 'New Name' });
  });

  it('accepts explicit null to clear bio', () => {
    expect(updateEmployeeSchema.parse({ bio: null })).toEqual({ bio: null });
  });

  it('rejects an empty body', () => {
    expect(() => updateEmployeeSchema.parse({})).toThrow();
  });

  it('rejects forbidden/protected fields (isActive, salonId)', () => {
    expect(() => updateEmployeeSchema.parse({ fullName: 'X', isActive: true })).toThrow();
    expect(() => updateEmployeeSchema.parse({ fullName: 'X', salonId: 'forged' })).toThrow();
  });
});
