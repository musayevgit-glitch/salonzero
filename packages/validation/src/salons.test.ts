import { describe, expect, it } from 'vitest';
import { createSalonSchema, listSalonsQuerySchema } from './salons';

describe('listSalonsQuerySchema', () => {
  it('defaults page/pageSize when omitted', () => {
    const result = listSalonsQuerySchema.parse({});
    expect(result).toEqual({ page: 1, pageSize: 20 });
  });

  it('caps pageSize at 100', () => {
    expect(() => listSalonsQuerySchema.parse({ pageSize: '1000' })).toThrow();
  });

  it('rejects an invalid status value', () => {
    expect(() => listSalonsQuerySchema.parse({ status: 'DELETED' })).toThrow();
  });

  it('rejects unknown query params', () => {
    expect(() => listSalonsQuerySchema.parse({ page: 1, sort: 'name' })).toThrow();
  });
});

describe('createSalonSchema', () => {
  const valid = { name: 'Demo Salon', timezone: 'Asia/Baku', adminEmail: 'admin@example.com' };

  it('accepts the minimal valid payload', () => {
    expect(createSalonSchema.parse(valid)).toMatchObject(valid);
  });

  it('normalizes a provided slug to lowercase', () => {
    const result = createSalonSchema.parse({ ...valid, slug: 'Demo-Salon' });
    expect(result.slug).toBe('demo-salon');
  });

  it('rejects a slug with invalid characters', () => {
    expect(() => createSalonSchema.parse({ ...valid, slug: 'demo salon!' })).toThrow();
  });

  it('rejects a missing name', () => {
    expect(() => createSalonSchema.parse({ ...valid, name: '' })).toThrow();
  });

  it('rejects a missing adminEmail', () => {
    const { adminEmail: _adminEmail, ...rest } = valid;
    expect(() => createSalonSchema.parse(rest)).toThrow();
  });

  it('rejects forbidden/protected fields (mass-assignment guard)', () => {
    expect(() => createSalonSchema.parse({ ...valid, status: 'SUSPENDED' })).toThrow();
    expect(() => createSalonSchema.parse({ ...valid, id: 'forged-id' })).toThrow();
    expect(() => createSalonSchema.parse({ ...valid, subdomain: 'forged' })).toThrow();
  });
});
