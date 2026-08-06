import { describe, expect, it } from 'vitest';
import { createTimeOffSchema } from './time-off';

const VALID = {
  startAt: '2026-08-10T09:00:00.000Z',
  endAt: '2026-08-12T17:00:00.000Z',
};

describe('createTimeOffSchema', () => {
  it('accepts a valid range without a reason', () => {
    expect(createTimeOffSchema.parse(VALID)).toEqual(VALID);
  });

  it('accepts a reason and acknowledgeConflicts', () => {
    const input = { ...VALID, reason: 'Vacation', acknowledgeConflicts: true };
    expect(createTimeOffSchema.parse(input)).toEqual(input);
  });

  it('rejects endAt before or equal to startAt', () => {
    expect(() =>
      createTimeOffSchema.parse({ startAt: VALID.endAt, endAt: VALID.startAt }),
    ).toThrow();
    expect(() =>
      createTimeOffSchema.parse({ startAt: VALID.startAt, endAt: VALID.startAt }),
    ).toThrow();
  });

  it('rejects a non-datetime startAt/endAt', () => {
    expect(() =>
      createTimeOffSchema.parse({ startAt: 'not-a-date', endAt: VALID.endAt }),
    ).toThrow();
  });

  it('rejects an empty reason', () => {
    expect(() => createTimeOffSchema.parse({ ...VALID, reason: '' })).toThrow();
  });

  it('rejects a reason over the length cap', () => {
    expect(() => createTimeOffSchema.parse({ ...VALID, reason: 'x'.repeat(501) })).toThrow();
  });

  it('rejects forbidden fields', () => {
    expect(() => createTimeOffSchema.parse({ ...VALID, employeeId: 'forged' })).toThrow();
  });
});
