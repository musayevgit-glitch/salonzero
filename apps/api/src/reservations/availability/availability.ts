import {
  addLocalDays,
  compareLocalDateParts,
  getLocalDateParts,
  getLocalWeekday,
  localWallTimeToUtc,
  type LocalDateParts,
} from './timezone';

export interface WorkingBlock {
  weekday: number; // 0 (Sunday) - 6 (Saturday)
  startMinuteOfDay: number;
  endMinuteOfDay: number;
}

export interface BreakBlock {
  weekday: number;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
}

export interface TimeOffPeriod {
  startAt: Date;
  endAt: Date;
}

export interface BlockingReservation {
  startAt: Date;
  endAt: Date;
  blockedUntil?: Date;
}

export interface EmployeeAvailabilityInput {
  employeeId: string;
  isActive: boolean;
  isEligibleForService: boolean;
  workingSchedule: WorkingBlock[];
  breaks: BreakBlock[];
  timeOff: TimeOffPeriod[];
  blockingReservations: BlockingReservation[];
}

export interface ComputeAvailabilityInput {
  /** IANA zone name — every WorkingSchedule/Break minute-of-day value is interpreted in this zone. */
  salonTimezone: string;
  /** The current instant, passed in rather than read from the system clock (deterministic tests). */
  now: Date;
  /** Inclusive UTC lower bound of the window to search. */
  rangeStart: Date;
  /** Exclusive UTC upper bound of the window to search. */
  rangeEnd: Date;
  serviceDurationMinutes: number;
  bufferMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  /** Grid spacing for candidate start times. Defaults to 15. */
  slotIntervalMinutes?: number;
  employees: EmployeeAvailabilityInput[];
}

export interface AvailableSlot {
  employeeId: string;
  /** The reservation's would-be startAt. */
  startAt: Date;
  /** The reservation's would-be endAt (service duration only — buffer is not part of the booked span). */
  endAt: Date;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

/**
 * Buffer design decision: a candidate slot's busy span for conflict-checking purposes is
 * [start, start + duration + buffer) — buffer is trailing padding that must not collide with the
 * *next* commitment (a break, time off, or another reservation), but is not required to fit before
 * the working day's own closing time. This keeps the interval math simple (no special end-of-day
 * carve-out) and matches common salon-scheduling behavior (buffer exists to protect against the
 * next client, not to pad unused time at closing).
 */
function computeEmployeeSlots(
  employee: EmployeeAvailabilityInput,
  timezone: string,
  earliestBookable: Date,
  latestBookable: Date,
  serviceDurationMinutes: number,
  bufferMinutes: number,
  slotIntervalMinutes: number,
): AvailableSlot[] {
  const slots: AvailableSlot[] = [];
  const busySpans: Array<{ start: Date; end: Date }> = [
    ...employee.timeOff.map((t) => ({ start: t.startAt, end: t.endAt })),
    ...employee.blockingReservations.map((r) => ({ start: r.startAt, end: r.blockedUntil ?? r.endAt })),
  ];

  let cursor: LocalDateParts = getLocalDateParts(earliestBookable, timezone);
  const lastDay: LocalDateParts = getLocalDateParts(latestBookable, timezone);

  // Iterating by local calendar day (not by fixed 24h steps) is what makes this correct across
  // DST transitions — a "day" can be 23 or 25 real hours, but is always exactly one calendar date.
  while (compareLocalDateParts(cursor, lastDay) <= 0) {
    const weekday = new Date(Date.UTC(cursor.year, cursor.month - 1, cursor.day)).getUTCDay();
    const dayBreaks = employee.breaks.filter((b) => b.weekday === weekday);

    for (const block of employee.workingSchedule.filter((w) => w.weekday === weekday)) {
      const lastPossibleStart = block.endMinuteOfDay - serviceDurationMinutes - bufferMinutes;
      for (
        let minute = block.startMinuteOfDay;
        minute <= lastPossibleStart;
        minute += slotIntervalMinutes
      ) {
        const candidateStart = localWallTimeToUtc(cursor, minute, timezone);
        if (
          candidateStart.getTime() < earliestBookable.getTime() ||
          candidateStart.getTime() >= latestBookable.getTime()
        ) {
          continue;
        }

        const candidateEnd = new Date(candidateStart.getTime() + serviceDurationMinutes * 60_000);
        const candidateBusyEnd = new Date(
          candidateStart.getTime() + (serviceDurationMinutes + bufferMinutes) * 60_000,
        );

        const breakConflict = dayBreaks.some((b) => {
          const breakStart = localWallTimeToUtc(cursor, b.startMinuteOfDay, timezone);
          const breakEnd = localWallTimeToUtc(cursor, b.endMinuteOfDay, timezone);
          return overlaps(candidateStart, candidateBusyEnd, breakStart, breakEnd);
        });
        if (breakConflict) continue;

        const busyConflict = busySpans.some((span) =>
          overlaps(candidateStart, candidateBusyEnd, span.start, span.end),
        );
        if (busyConflict) continue;

        slots.push({
          employeeId: employee.employeeId,
          startAt: candidateStart,
          endAt: candidateEnd,
        });
      }
    }

    cursor = addLocalDays(cursor, 1);
  }

  return slots;
}

/**
 * Pure availability computation — no I/O. Callers (Section 15.3+) are responsible for loading
 * every input from the database (never trusting client-supplied schedule/eligibility/pricing data)
 * and passing plain data in; this function only reasons about the data it's given.
 */
export function computeAvailability(input: ComputeAvailabilityInput): AvailableSlot[] {
  const slotIntervalMinutes = input.slotIntervalMinutes ?? 15;

  const earliestBookable = new Date(
    Math.max(input.rangeStart.getTime(), input.now.getTime() + input.minNoticeMinutes * 60_000),
  );
  const latestBookable = new Date(
    Math.min(
      input.rangeEnd.getTime(),
      input.now.getTime() + input.maxAdvanceDays * 24 * 60 * 60_000,
    ),
  );

  if (earliestBookable.getTime() >= latestBookable.getTime()) {
    return [];
  }

  const results: AvailableSlot[] = [];
  for (const employee of input.employees) {
    if (!employee.isActive || !employee.isEligibleForService) continue;
    results.push(
      ...computeEmployeeSlots(
        employee,
        input.salonTimezone,
        earliestBookable,
        latestBookable,
        input.serviceDurationMinutes,
        input.bufferMinutes,
        slotIntervalMinutes,
      ),
    );
  }

  results.sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime() || a.employeeId.localeCompare(b.employeeId),
  );
  return results;
}

export interface SingleSlotCheckInput {
  employee: EmployeeAvailabilityInput;
  salonTimezone: string;
  /** The current instant — same determinism contract as ComputeAvailabilityInput.now. */
  now: Date;
  candidateStart: Date;
  serviceDurationMinutes: number;
  bufferMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
}

/**
 * Re-verifies one exact candidate instant (as opposed to `computeAvailability`'s grid-generated
 * list) — this is what Section 15.3's booking transaction calls to re-check the specific slot a
 * customer requested, since an arbitrary requested `startAt` may not land on the slot-interval grid
 * a listing call would have used.
 */
export function isEmployeeSlotAvailable(input: SingleSlotCheckInput): boolean {
  const { employee, salonTimezone, now, candidateStart, serviceDurationMinutes, bufferMinutes } =
    input;

  if (!employee.isActive || !employee.isEligibleForService) return false;

  const earliestBookable = now.getTime() + input.minNoticeMinutes * 60_000;
  const latestBookable = now.getTime() + input.maxAdvanceDays * 24 * 60 * 60_000;
  if (candidateStart.getTime() < earliestBookable || candidateStart.getTime() >= latestBookable) {
    return false;
  }

  const weekday = getLocalWeekday(candidateStart, salonTimezone);
  const localDate = getLocalDateParts(candidateStart, salonTimezone);
  const candidateEnd = new Date(candidateStart.getTime() + serviceDurationMinutes * 60_000);
  const candidateBusyEnd = new Date(
    candidateStart.getTime() + (serviceDurationMinutes + bufferMinutes) * 60_000,
  );

  const withinWorkingBlock = employee.workingSchedule.some((block) => {
    if (block.weekday !== weekday) return false;
    const blockStart = localWallTimeToUtc(localDate, block.startMinuteOfDay, salonTimezone);
    const blockEnd = localWallTimeToUtc(localDate, block.endMinuteOfDay, salonTimezone);
    return (
      candidateStart.getTime() >= blockStart.getTime() &&
      candidateEnd.getTime() <= blockEnd.getTime()
    );
  });
  if (!withinWorkingBlock) return false;

  const breakConflict = employee.breaks.some((b) => {
    if (b.weekday !== weekday) return false;
    const breakStart = localWallTimeToUtc(localDate, b.startMinuteOfDay, salonTimezone);
    const breakEnd = localWallTimeToUtc(localDate, b.endMinuteOfDay, salonTimezone);
    return overlaps(candidateStart, candidateBusyEnd, breakStart, breakEnd);
  });
  if (breakConflict) return false;

  const busySpans: Array<{ start: Date; end: Date }> = [
    ...employee.timeOff.map((t) => ({ start: t.startAt, end: t.endAt })),
    ...employee.blockingReservations.map((r) => ({ start: r.startAt, end: r.blockedUntil ?? r.endAt })),
  ];
  return !busySpans.some((span) =>
    overlaps(candidateStart, candidateBusyEnd, span.start, span.end),
  );
}

/** Convenience helper for the "any suitable stylist" flow — same slots, employee identity dropped. */
export function computeAnyStylistAvailability(
  input: ComputeAvailabilityInput,
): Array<Pick<AvailableSlot, 'startAt' | 'endAt'>> {
  const seen = new Set<number>();
  const merged: Array<Pick<AvailableSlot, 'startAt' | 'endAt'>> = [];
  for (const slot of computeAvailability(input)) {
    const key = slot.startAt.getTime();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ startAt: slot.startAt, endAt: slot.endAt });
  }
  return merged;
}
