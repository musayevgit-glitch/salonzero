import { describe, expect, it } from 'vitest';
import { createWorkingScheduleSchema, MINUTES_PER_DAY } from './working-schedule';

const VALID = { weekday: 1, startMinuteOfDay: 540, endMinuteOfDay: 1020 }; // Mon 9:00-17:00

describe('createWorkingScheduleSchema', () => {
  it('accepts a valid interval', () => {
    expect(createWorkingScheduleSchema.parse(VALID)).toEqual(VALID);
  });

  it('accepts an interval ending at midnight (1440)', () => {
    const input = { weekday: 5, startMinuteOfDay: 1200, endMinuteOfDay: MINUTES_PER_DAY };
    expect(createWorkingScheduleSchema.parse(input)).toEqual(input);
  });

  it('rejects a reversed interval (end before start)', () => {
    expect(() =>
      createWorkingScheduleSchema.parse({ ...VALID, startMinuteOfDay: 1020, endMinuteOfDay: 540 }),
    ).toThrow();
  });

  it('rejects a zero-length interval (end equals start)', () => {
    expect(() =>
      createWorkingScheduleSchema.parse({ ...VALID, startMinuteOfDay: 540, endMinuteOfDay: 540 }),
    ).toThrow();
  });

  it('rejects an out-of-range weekday', () => {
    expect(() => createWorkingScheduleSchema.parse({ ...VALID, weekday: 7 })).toThrow();
    expect(() => createWorkingScheduleSchema.parse({ ...VALID, weekday: -1 })).toThrow();
  });

  it('rejects startMinuteOfDay/endMinuteOfDay out of bounds', () => {
    expect(() => createWorkingScheduleSchema.parse({ ...VALID, startMinuteOfDay: -1 })).toThrow();
    expect(() =>
      createWorkingScheduleSchema.parse({ ...VALID, endMinuteOfDay: MINUTES_PER_DAY + 1 }),
    ).toThrow();
  });

  it('rejects forbidden fields', () => {
    expect(() => createWorkingScheduleSchema.parse({ ...VALID, employeeId: 'forged' })).toThrow();
  });
});
