import { describe, expect, it } from 'vitest';
import { listSalonsQuerySchema } from './salons';

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
