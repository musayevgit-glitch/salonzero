import { describe, expect, it } from 'vitest';
import { createBreakSchema } from './breaks';
import { MINUTES_PER_DAY } from './working-schedule';

const VALID = { weekday: 1, startMinuteOfDay: 720, endMinuteOfDay: 780 }; // Mon 12:00-13:00

describe('createBreakSchema', () => {
  it('accepts a valid interval', () => {
    expect(createBreakSchema.parse(VALID)).toEqual(VALID);
  });

  it('rejects a reversed interval', () => {
    expect(() =>
      createBreakSchema.parse({ ...VALID, startMinuteOfDay: 780, endMinuteOfDay: 720 }),
    ).toThrow();
  });

  it('rejects a zero-length interval', () => {
    expect(() =>
      createBreakSchema.parse({ ...VALID, startMinuteOfDay: 720, endMinuteOfDay: 720 }),
    ).toThrow();
  });

  it('rejects an out-of-range weekday', () => {
    expect(() => createBreakSchema.parse({ ...VALID, weekday: 7 })).toThrow();
  });

  it('rejects out-of-bounds minute values', () => {
    expect(() =>
      createBreakSchema.parse({ ...VALID, endMinuteOfDay: MINUTES_PER_DAY + 1 }),
    ).toThrow();
  });

  it('rejects forbidden fields', () => {
    expect(() => createBreakSchema.parse({ ...VALID, employeeId: 'forged' })).toThrow();
  });
});
