import { describe, expect, it } from 'vitest';
import {
  createServiceCategorySchema,
  reorderServiceCategoriesSchema,
  updateServiceCategorySchema,
} from './service-categories';

describe('createServiceCategorySchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(createServiceCategorySchema.parse({ name: 'Hair' })).toEqual({ name: 'Hair' });
  });

  it('rejects a missing name', () => {
    expect(() => createServiceCategorySchema.parse({})).toThrow();
  });

  it('rejects an empty name', () => {
    expect(() => createServiceCategorySchema.parse({ name: '   ' })).toThrow();
  });

  it('rejects forbidden/protected fields (salonId, id, isActive, sortOrder)', () => {
    expect(() => createServiceCategorySchema.parse({ name: 'Hair', salonId: 'forged' })).toThrow();
    expect(() => createServiceCategorySchema.parse({ name: 'Hair', id: 'forged' })).toThrow();
    expect(() => createServiceCategorySchema.parse({ name: 'Hair', isActive: false })).toThrow();
    expect(() => createServiceCategorySchema.parse({ name: 'Hair', sortOrder: 5 })).toThrow();
  });
});

describe('updateServiceCategorySchema', () => {
  it('accepts a partial update with a single field', () => {
    expect(updateServiceCategorySchema.parse({ name: 'Nails' })).toEqual({ name: 'Nails' });
  });

  it('rejects an empty body', () => {
    expect(() => updateServiceCategorySchema.parse({})).toThrow();
  });

  it('rejects forbidden/protected fields (isActive, salonId)', () => {
    expect(() => updateServiceCategorySchema.parse({ name: 'X', isActive: true })).toThrow();
    expect(() => updateServiceCategorySchema.parse({ name: 'X', salonId: 'forged' })).toThrow();
  });
});

describe('reorderServiceCategoriesSchema', () => {
  it('accepts an ordered list of category ids', () => {
    const ids = ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'];
    expect(reorderServiceCategoriesSchema.parse({ categoryIds: ids })).toEqual({
      categoryIds: ids,
    });
  });

  it('rejects an empty list', () => {
    expect(() => reorderServiceCategoriesSchema.parse({ categoryIds: [] })).toThrow();
  });

  it('rejects non-uuid entries', () => {
    expect(() => reorderServiceCategoriesSchema.parse({ categoryIds: ['not-a-uuid'] })).toThrow();
  });
});
