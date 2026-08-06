/**
 * Deterministic, dependency-free zoned-time helpers for the availability engine. Every function
 * here is pure: given the same instant/zone inputs, they always return the same output — no
 * reliance on the system clock or environment timezone.
 */

export interface LocalDateParts {
  year: number;
  month: number; // 1-12
  day: number;
}

const PARTS_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function getPartsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = PARTS_FORMATTER_CACHE.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    PARTS_FORMATTER_CACHE.set(timeZone, formatter);
  }
  return formatter;
}

interface ZonedParts extends LocalDateParts {
  hour: number;
  minute: number;
  second: number;
}

function getZonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = getPartsFormatter(timeZone)
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** The calendar date (in `timeZone`) that `instant` falls on. */
export function getLocalDateParts(instant: Date, timeZone: string): LocalDateParts {
  const { year, month, day } = getZonedParts(instant, timeZone);
  return { year, month, day };
}

/** 0 (Sunday) – 6 (Saturday), matching WorkingSchedule/Break's `weekday` convention. */
export function getLocalWeekday(instant: Date, timeZone: string): number {
  const { year, month, day } = getLocalDateParts(instant, timeZone);
  // Weekday is a pure calendar-date property; UTC-anchoring the date-only value for this
  // computation is safe and avoids re-running the zoned formatter.
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Calendar-date arithmetic (not instant arithmetic) — adding a day always means "the next date". */
export function addLocalDays(date: LocalDateParts, deltaDays: number): LocalDateParts {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + deltaDays));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function compareLocalDateParts(a: LocalDateParts, b: LocalDateParts): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/**
 * Resolves the offset (ms) such that `localInstantGuess + offset` reads as `localInstantGuess`'s
 * own wall-clock time when formatted in `timeZone`. Used iteratively below to convert a
 * zone-local wall-clock time to the correct UTC instant, including across DST transitions.
 */
function getOffsetMs(instantGuess: Date, timeZone: string): number {
  const { year, month, day, hour, minute, second } = getZonedParts(instantGuess, timeZone);
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asIfUtc - instantGuess.getTime();
}

/**
 * Converts a zone-local wall-clock time (calendar date + minute-of-day, e.g. from
 * WorkingSchedule/Break) to the UTC instant it represents.
 *
 * DST policy (deterministic, documented rather than "perfectly" disambiguated):
 * - Spring-forward gap (wall time doesn't exist, e.g. 02:30 on a "spring forward at 02:00" day):
 *   resolves to the instant `Intl` computes for that nominal wall time, which lands after the gap
 *   (consistent, never throws).
 * - Fall-back fold (wall time occurs twice): resolves to the first occurrence, consistently,
 *   since the iterative correction converges on the offset in effect at the initial UTC guess.
 */
export function localWallTimeToUtc(
  date: LocalDateParts,
  minuteOfDay: number,
  timeZone: string,
): Date {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const naiveUtcMs = Date.UTC(date.year, date.month - 1, date.day, hour, minute, 0);

  // Iterate to convergence — one pass is usually enough, but a value right at a DST boundary can
  // need a second correction to settle.
  let instant = new Date(naiveUtcMs);
  for (let i = 0; i < 3; i++) {
    const offset = getOffsetMs(instant, timeZone);
    const corrected = new Date(naiveUtcMs - offset);
    if (corrected.getTime() === instant.getTime()) break;
    instant = corrected;
  }
  return instant;
}
