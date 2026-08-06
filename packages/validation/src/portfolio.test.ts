import { describe, expect, it } from 'vitest';
import {
  confirmPortfolioItemSchema,
  MAX_PORTFOLIO_UPLOAD_BYTES,
  reorderPortfolioSchema,
  requestPortfolioUploadSchema,
  updatePortfolioItemSchema,
} from './portfolio';

describe('requestPortfolioUploadSchema', () => {
  it('accepts an allowed MIME type within the size limit', () => {
    expect(requestPortfolioUploadSchema.parse({ mimeType: 'image/jpeg', sizeBytes: 1000 })).toEqual(
      { mimeType: 'image/jpeg', sizeBytes: 1000 },
    );
  });

  it('rejects a disallowed MIME type (svg)', () => {
    expect(() =>
      requestPortfolioUploadSchema.parse({ mimeType: 'image/svg+xml', sizeBytes: 1000 }),
    ).toThrow();
  });

  it('rejects an executable MIME type', () => {
    expect(() =>
      requestPortfolioUploadSchema.parse({ mimeType: 'application/x-msdownload', sizeBytes: 1000 }),
    ).toThrow();
  });

  it('rejects a size over the limit', () => {
    expect(() =>
      requestPortfolioUploadSchema.parse({
        mimeType: 'image/png',
        sizeBytes: MAX_PORTFOLIO_UPLOAD_BYTES + 1,
      }),
    ).toThrow();
  });

  it('rejects forbidden fields', () => {
    expect(() =>
      requestPortfolioUploadSchema.parse({
        mimeType: 'image/png',
        sizeBytes: 1000,
        objectKey: 'forged',
      }),
    ).toThrow();
  });
});

describe('confirmPortfolioItemSchema', () => {
  it('accepts an objectKey with an optional caption', () => {
    expect(
      confirmPortfolioItemSchema.parse({ objectKey: 'employees/a/b.jpg', caption: 'Before/after' }),
    ).toEqual({ objectKey: 'employees/a/b.jpg', caption: 'Before/after' });
  });

  it('rejects a missing objectKey', () => {
    expect(() => confirmPortfolioItemSchema.parse({ caption: 'x' })).toThrow();
  });

  it('rejects forbidden fields (sortOrder, id)', () => {
    expect(() =>
      confirmPortfolioItemSchema.parse({ objectKey: 'employees/a/b.jpg', sortOrder: 0 }),
    ).toThrow();
    expect(() =>
      confirmPortfolioItemSchema.parse({ objectKey: 'employees/a/b.jpg', id: 'forged' }),
    ).toThrow();
  });
});

describe('updatePortfolioItemSchema', () => {
  it('accepts a new caption', () => {
    expect(updatePortfolioItemSchema.parse({ caption: 'New caption' })).toEqual({
      caption: 'New caption',
    });
  });

  it('accepts an explicit null to clear the caption', () => {
    expect(updatePortfolioItemSchema.parse({ caption: null })).toEqual({ caption: null });
  });

  it('rejects a missing caption field entirely', () => {
    expect(() => updatePortfolioItemSchema.parse({})).toThrow();
  });
});

describe('reorderPortfolioSchema', () => {
  it('accepts an ordered list of item ids', () => {
    const ids = ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'];
    expect(reorderPortfolioSchema.parse({ itemIds: ids })).toEqual({ itemIds: ids });
  });

  it('rejects an empty list', () => {
    expect(() => reorderPortfolioSchema.parse({ itemIds: [] })).toThrow();
  });

  it('rejects non-uuid entries', () => {
    expect(() => reorderPortfolioSchema.parse({ itemIds: ['not-a-uuid'] })).toThrow();
  });
});
