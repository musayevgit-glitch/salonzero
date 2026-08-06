import { describe, expect, it } from 'vitest';
import { updateCustomerProfileSchema } from './customer-profile';

describe('updateCustomerProfileSchema', () => {
  it('accepts a single field', () => {
    expect(updateCustomerProfileSchema.parse({ fullName: 'Jane Doe' })).toEqual({
      fullName: 'Jane Doe',
    });
  });

  it('accepts all fields together, including an explicit null phone', () => {
    expect(
      updateCustomerProfileSchema.parse({ fullName: 'Jane', phone: null, marketingConsent: true }),
    ).toEqual({ fullName: 'Jane', phone: null, marketingConsent: true });
  });

  it('rejects an empty body', () => {
    expect(() => updateCustomerProfileSchema.parse({})).toThrow();
  });

  it('rejects an empty fullName or an oversized value', () => {
    expect(() => updateCustomerProfileSchema.parse({ fullName: '' })).toThrow();
    expect(() => updateCustomerProfileSchema.parse({ fullName: 'x'.repeat(201) })).toThrow();
  });

  it('rejects forbidden/protected fields (mass assignment)', () => {
    expect(() => updateCustomerProfileSchema.parse({ email: 'new@example.com' })).toThrow();
    expect(() => updateCustomerProfileSchema.parse({ id: 'forged' })).toThrow();
    expect(() => updateCustomerProfileSchema.parse({ isSuperadmin: true })).toThrow();
    expect(() => updateCustomerProfileSchema.parse({ status: 'SUSPENDED' })).toThrow();
  });
});
