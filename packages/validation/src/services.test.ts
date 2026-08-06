import { describe, expect, it } from 'vitest';
import {
  createServiceSchema,
  listServicesQuerySchema,
  MAX_BUFFER_MINUTES,
  MAX_DURATION_MINUTES,
  MAX_PRICE_MINOR_UNITS,
  MIN_DURATION_MINUTES,
  updateServiceSchema,
} from './services';

const VALID_BASE = {
  name: 'Haircut',
  priceAmount: 5000,
  currency: 'USD',
  durationMinutes: 45,
};

describe('listServicesQuerySchema', () => {
  it('defaults page/pageSize when omitted', () => {
    expect(listServicesQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('coerces isActive and accepts categoryId', () => {
    const categoryId = '11111111-1111-1111-1111-111111111111';
    const parsed = listServicesQuerySchema.parse({ isActive: 'true', categoryId });
    expect(parsed.isActive).toBe(true);
    expect(parsed.categoryId).toBe(categoryId);
  });

  it('rejects unknown query params', () => {
    expect(() => listServicesQuerySchema.parse({ sort: 'name' })).toThrow();
  });
});

describe('createServiceSchema', () => {
  it('accepts a minimal valid payload, defaulting bufferMinutes to 0', () => {
    expect(createServiceSchema.parse(VALID_BASE)).toEqual({ ...VALID_BASE, bufferMinutes: 0 });
  });

  it('accepts an optional categoryId, description, and bufferMinutes', () => {
    const categoryId = '11111111-1111-1111-1111-111111111111';
    const parsed = createServiceSchema.parse({
      ...VALID_BASE,
      categoryId,
      description: 'A classic cut',
      bufferMinutes: 10,
    });
    expect(parsed.categoryId).toBe(categoryId);
    expect(parsed.description).toBe('A classic cut');
    expect(parsed.bufferMinutes).toBe(10);
  });

  it('rejects a missing required field', () => {
    expect(() => createServiceSchema.parse({ name: 'Haircut' })).toThrow();
  });

  it('rejects a negative price', () => {
    expect(() => createServiceSchema.parse({ ...VALID_BASE, priceAmount: -1 })).toThrow();
  });

  it('rejects a price over the sanity cap', () => {
    expect(() =>
      createServiceSchema.parse({ ...VALID_BASE, priceAmount: MAX_PRICE_MINOR_UNITS + 1 }),
    ).toThrow();
  });

  it('rejects a non-integer price (no floats for money)', () => {
    expect(() => createServiceSchema.parse({ ...VALID_BASE, priceAmount: 50.5 })).toThrow();
  });

  it('rejects a malformed currency code', () => {
    expect(() => createServiceSchema.parse({ ...VALID_BASE, currency: 'usd' })).toThrow();
    expect(() => createServiceSchema.parse({ ...VALID_BASE, currency: 'US' })).toThrow();
    expect(() => createServiceSchema.parse({ ...VALID_BASE, currency: 'USDD' })).toThrow();
  });

  it('rejects durationMinutes below the minimum', () => {
    expect(() =>
      createServiceSchema.parse({ ...VALID_BASE, durationMinutes: MIN_DURATION_MINUTES - 1 }),
    ).toThrow();
  });

  it('rejects durationMinutes above the maximum', () => {
    expect(() =>
      createServiceSchema.parse({ ...VALID_BASE, durationMinutes: MAX_DURATION_MINUTES + 1 }),
    ).toThrow();
  });

  it('rejects bufferMinutes above the maximum', () => {
    expect(() =>
      createServiceSchema.parse({ ...VALID_BASE, bufferMinutes: MAX_BUFFER_MINUTES + 1 }),
    ).toThrow();
  });

  it('rejects a negative bufferMinutes', () => {
    expect(() => createServiceSchema.parse({ ...VALID_BASE, bufferMinutes: -1 })).toThrow();
  });

  it('rejects forbidden/protected fields (salonId, id, isActive)', () => {
    expect(() => createServiceSchema.parse({ ...VALID_BASE, salonId: 'forged' })).toThrow();
    expect(() => createServiceSchema.parse({ ...VALID_BASE, id: 'forged' })).toThrow();
    expect(() => createServiceSchema.parse({ ...VALID_BASE, isActive: false })).toThrow();
  });
});

describe('updateServiceSchema', () => {
  it('accepts a partial update with a single field', () => {
    expect(updateServiceSchema.parse({ name: 'New Name' })).toEqual({ name: 'New Name' });
  });

  it('accepts explicit null to clear categoryId/description', () => {
    expect(updateServiceSchema.parse({ categoryId: null })).toEqual({ categoryId: null });
    expect(updateServiceSchema.parse({ description: null })).toEqual({ description: null });
  });

  it('rejects an empty body', () => {
    expect(() => updateServiceSchema.parse({})).toThrow();
  });

  it('rejects forbidden/protected fields (isActive, salonId)', () => {
    expect(() => updateServiceSchema.parse({ name: 'X', isActive: true })).toThrow();
    expect(() => updateServiceSchema.parse({ name: 'X', salonId: 'forged' })).toThrow();
  });
});
