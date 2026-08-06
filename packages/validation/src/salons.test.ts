import { describe, expect, it } from 'vitest';
import { createSalonSchema, listSalonsQuerySchema, updateSalonSchema } from './salons';

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

describe('updateSalonSchema', () => {
  it('accepts a partial update with a single field', () => {
    expect(updateSalonSchema.parse({ name: 'New Name' })).toEqual({ name: 'New Name' });
  });

  it('accepts explicit null to clear an optional field', () => {
    expect(updateSalonSchema.parse({ city: null })).toEqual({ city: null });
  });

  it('rejects an empty body (no editable field provided)', () => {
    expect(() => updateSalonSchema.parse({})).toThrow();
  });

  it('rejects a body containing only expectedUpdatedAt', () => {
    expect(() =>
      updateSalonSchema.parse({ expectedUpdatedAt: new Date().toISOString() }),
    ).toThrow();
  });

  it('rejects an invalid email', () => {
    expect(() => updateSalonSchema.parse({ email: 'not-an-email' })).toThrow();
  });

  it('rejects forbidden/protected fields (slug, status, subdomain, id)', () => {
    expect(() => updateSalonSchema.parse({ name: 'X', slug: 'new-slug' })).toThrow();
    expect(() => updateSalonSchema.parse({ name: 'X', status: 'SUSPENDED' })).toThrow();
    expect(() => updateSalonSchema.parse({ name: 'X', subdomain: 'forged' })).toThrow();
    expect(() => updateSalonSchema.parse({ name: 'X', id: 'forged-id' })).toThrow();
  });
});
