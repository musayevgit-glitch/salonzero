import { describe, expect, it } from 'vitest';
import {
  addLocalDays,
  compareLocalDateParts,
  getLocalDateParts,
  getLocalWeekday,
  localWallTimeToUtc,
} from './timezone';

describe('getLocalDateParts / getLocalWeekday', () => {
  it('reads the calendar date in the given zone, not UTC', () => {
    // 2026-01-15 23:30 UTC is already 2026-01-16 in Asia/Tokyo (UTC+9).
    const instant = new Date('2026-01-15T23:30:00.000Z');
    expect(getLocalDateParts(instant, 'Asia/Tokyo')).toEqual({ year: 2026, month: 1, day: 16 });
    expect(getLocalDateParts(instant, 'UTC')).toEqual({ year: 2026, month: 1, day: 15 });
  });

  it('computes the correct weekday for a known date', () => {
    // 2026-01-19 is a Monday.
    const instant = new Date('2026-01-19T12:00:00.000Z');
    expect(getLocalWeekday(instant, 'UTC')).toBe(1);
  });
});

describe('addLocalDays / compareLocalDateParts', () => {
  it('rolls over month/year boundaries', () => {
    expect(addLocalDays({ year: 2026, month: 1, day: 31 }, 1)).toEqual({
      year: 2026,
      month: 2,
      day: 1,
    });
    expect(addLocalDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    });
  });

  it('orders dates correctly', () => {
    expect(
      compareLocalDateParts({ year: 2026, month: 1, day: 1 }, { year: 2026, month: 1, day: 2 }),
    ).toBeLessThan(0);
    expect(
      compareLocalDateParts({ year: 2026, month: 2, day: 1 }, { year: 2026, month: 1, day: 31 }),
    ).toBeGreaterThan(0);
    expect(
      compareLocalDateParts({ year: 2026, month: 1, day: 1 }, { year: 2026, month: 1, day: 1 }),
    ).toBe(0);
  });
});

describe('localWallTimeToUtc', () => {
  it('converts a plain UTC wall time correctly', () => {
    const instant = localWallTimeToUtc({ year: 2026, month: 6, day: 15 }, 9 * 60, 'UTC');
    expect(instant.toISOString()).toBe('2026-06-15T09:00:00.000Z');
  });

  it('converts a wall time in a fixed negative-offset zone', () => {
    // America/New_York is UTC-4 in June (EDT).
    const instant = localWallTimeToUtc(
      { year: 2026, month: 6, day: 15 },
      9 * 60,
      'America/New_York',
    );
    expect(instant.toISOString()).toBe('2026-06-15T13:00:00.000Z');
  });

  it('converts correctly on either side of the US spring-forward transition (2026-03-08)', () => {
    // Before the transition (EST, UTC-5): 01:30 local -> 06:30 UTC.
    const before = localWallTimeToUtc(
      { year: 2026, month: 3, day: 8 },
      1 * 60 + 30,
      'America/New_York',
    );
    expect(before.toISOString()).toBe('2026-03-08T06:30:00.000Z');

    // After the transition (EDT, UTC-4): 09:00 local -> 13:00 UTC.
    const after = localWallTimeToUtc({ year: 2026, month: 3, day: 8 }, 9 * 60, 'America/New_York');
    expect(after.toISOString()).toBe('2026-03-08T13:00:00.000Z');
  });

  it('resolves deterministically for a nominally nonexistent spring-forward time (02:30)', () => {
    // 2026-03-08 02:00 -> 03:00 is skipped entirely in America/New_York. The same input must
    // always produce the same output (determinism), even though the wall time never truly existed.
    const first = localWallTimeToUtc(
      { year: 2026, month: 3, day: 8 },
      2 * 60 + 30,
      'America/New_York',
    );
    const second = localWallTimeToUtc(
      { year: 2026, month: 3, day: 8 },
      2 * 60 + 30,
      'America/New_York',
    );
    expect(first.getTime()).toBe(second.getTime());
  });

  it('converts correctly on either side of the US fall-back transition (2026-11-01, 2am local)', () => {
    // Before the transition (EDT, UTC-4): 00:30 local, well before the 2am switch -> 04:30 UTC.
    const before = localWallTimeToUtc({ year: 2026, month: 11, day: 1 }, 30, 'America/New_York');
    expect(before.toISOString()).toBe('2026-11-01T04:30:00.000Z');

    // After the transition (EST, UTC-5): 09:00 local *that same day* (already past the 2am switch,
    // which is why fall-back is often mistaken for only affecting "the next day") -> 14:00 UTC.
    const after = localWallTimeToUtc({ year: 2026, month: 11, day: 1 }, 9 * 60, 'America/New_York');
    expect(after.toISOString()).toBe('2026-11-01T14:00:00.000Z');
  });

  it('resolves the fold (1:30am occurs twice on fall-back day) deterministically', () => {
    const first = localWallTimeToUtc(
      { year: 2026, month: 11, day: 1 },
      1 * 60 + 30,
      'America/New_York',
    );
    const second = localWallTimeToUtc(
      { year: 2026, month: 11, day: 1 },
      1 * 60 + 30,
      'America/New_York',
    );
    expect(first.getTime()).toBe(second.getTime());
  });

  it('converts a wall time in a positive-offset zone with no DST', () => {
    // Asia/Tokyo is a fixed UTC+9.
    const instant = localWallTimeToUtc({ year: 2026, month: 6, day: 15 }, 9 * 60, 'Asia/Tokyo');
    expect(instant.toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });
});
