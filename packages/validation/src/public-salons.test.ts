import { describe, expect, it } from 'vitest';
import { listPublicSalonsQuerySchema } from './public-salons';

describe('listPublicSalonsQuerySchema', () => {
  it('applies defaults for an empty query', () => {
    expect(listPublicSalonsQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      sort: 'name_asc',
    });
  });

  it('accepts all optional filters together', () => {
    const result = listPublicSalonsQuerySchema.parse({
      page: '2',
      pageSize: '10',
      search: 'downtown',
      city: 'Baku',
      genderFocus: 'WOMEN',
      minPrice: '1000',
      maxPrice: '5000',
      sort: 'newest',
    });
    expect(result).toEqual({
      page: 2,
      pageSize: 10,
      search: 'downtown',
      city: 'Baku',
      genderFocus: 'WOMEN',
      minPrice: 1000,
      maxPrice: 5000,
      sort: 'newest',
    });
  });

  it('rejects minPrice greater than maxPrice', () => {
    expect(() => listPublicSalonsQuerySchema.parse({ minPrice: 100, maxPrice: 50 })).toThrow();
  });

  it('rejects an invalid genderFocus or sort value', () => {
    expect(() => listPublicSalonsQuerySchema.parse({ genderFocus: 'OTHER' })).toThrow();
    expect(() => listPublicSalonsQuerySchema.parse({ sort: 'price_asc' })).toThrow();
  });

  it('rejects an oversized pageSize and forbidden/unknown fields', () => {
    expect(() => listPublicSalonsQuerySchema.parse({ pageSize: 500 })).toThrow();
    expect(() => listPublicSalonsQuerySchema.parse({ status: 'SUSPENDED' })).toThrow();
    expect(() => listPublicSalonsQuerySchema.parse({ includeInactive: true })).toThrow();
  });
});
