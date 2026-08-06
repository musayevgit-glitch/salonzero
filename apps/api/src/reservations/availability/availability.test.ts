import { describe, expect, it } from 'vitest';
import {
  computeAnyStylistAvailability,
  computeAvailability,
  isEmployeeSlotAvailable,
  type ComputeAvailabilityInput,
  type EmployeeAvailabilityInput,
} from './availability';

function baseEmployee(
  overrides: Partial<EmployeeAvailabilityInput> = {},
): EmployeeAvailabilityInput {
  return {
    employeeId: 'emp-1',
    isActive: true,
    isEligibleForService: true,
    workingSchedule: [],
    breaks: [],
    timeOff: [],
    blockingReservations: [],
    ...overrides,
  };
}

function baseInput(overrides: Partial<ComputeAvailabilityInput> = {}): ComputeAvailabilityInput {
  return {
    salonTimezone: 'UTC',
    now: new Date('2026-06-01T00:00:00.000Z'), // a Monday
    rangeStart: new Date('2026-06-01T00:00:00.000Z'),
    rangeEnd: new Date('2026-06-08T00:00:00.000Z'),
    serviceDurationMinutes: 60,
    bufferMinutes: 0,
    minNoticeMinutes: 0,
    maxAdvanceDays: 30,
    employees: [],
    ...overrides,
  };
}

describe('computeAvailability — basic working-hours slots', () => {
  it('generates slots within a single working block, at the slot interval', () => {
    const input = baseInput({
      employees: [
        baseEmployee({
          workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
        }),
      ],
    });
    const slots = computeAvailability(input);
    // 09:00-11:00 working, 60min service, 15min grid -> starts at 09:00, 09:15, ..., last start
    // must satisfy start + 60 <= 11:00 -> last start is 10:00.
    expect(slots.map((s) => s.startAt.toISOString())).toEqual([
      '2026-06-01T09:00:00.000Z',
      '2026-06-01T09:15:00.000Z',
      '2026-06-01T09:30:00.000Z',
      '2026-06-01T09:45:00.000Z',
      '2026-06-01T10:00:00.000Z',
    ]);
  });

  it('returns no slots for an inactive employee', () => {
    const input = baseInput({
      employees: [
        baseEmployee({
          isActive: false,
          workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
        }),
      ],
    });
    expect(computeAvailability(input)).toEqual([]);
  });

  it('returns no slots for an employee ineligible for the service', () => {
    const input = baseInput({
      employees: [
        baseEmployee({
          isEligibleForService: false,
          workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
        }),
      ],
    });
    expect(computeAvailability(input)).toEqual([]);
  });

  it('excludes every slot whose 60min window overlaps a 30min break', () => {
    const input = baseInput({
      employees: [
        baseEmployee({
          workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
          breaks: [{ weekday: 1, startMinuteOfDay: 9 * 60 + 30, endMinuteOfDay: 10 * 60 }],
        }),
      ],
    });
    const slots = computeAvailability(input).map((s) => s.startAt.toISOString());
    // Candidates are 09:00/09:15/09:30/09:45/10:00 (last start = 11:00 - 60min). A break from
    // 09:30-10:00 falls inside every 60-minute window that starts before 10:00, so only the 10:00
    // start (10:00-11:00, which begins exactly as the break ends) survives.
    expect(slots).toEqual(['2026-06-01T10:00:00.000Z']);
  });

  it('excludes every slot whose 60min window overlaps a blocking reservation', () => {
    const input = baseInput({
      employees: [
        baseEmployee({
          workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
          blockingReservations: [
            {
              startAt: new Date('2026-06-01T09:30:00.000Z'),
              endAt: new Date('2026-06-01T10:00:00.000Z'),
            },
          ],
        }),
      ],
    });
    const slots = computeAvailability(input).map((s) => s.startAt.toISOString());
    // Same reasoning as the break test: only the 10:00 start (touching, not overlapping) survives.
    expect(slots).toEqual(['2026-06-01T10:00:00.000Z']);
  });

  it('excludes a slot that overlaps a time-off period', () => {
    const input = baseInput({
      employees: [
        baseEmployee({
          workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
          timeOff: [
            {
              startAt: new Date('2026-06-01T00:00:00.000Z'),
              endAt: new Date('2026-06-02T00:00:00.000Z'),
            },
          ],
        }),
      ],
    });
    expect(computeAvailability(input)).toEqual([]);
  });

  it('respects the buffer as trailing padding before the next commitment', () => {
    const input = baseInput({
      bufferMinutes: 15,
      employees: [
        baseEmployee({
          workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
          blockingReservations: [
            {
              startAt: new Date('2026-06-01T10:00:00.000Z'),
              endAt: new Date('2026-06-01T10:30:00.000Z'),
            },
          ],
        }),
      ],
    });
    const slots = computeAvailability(input).map((s) => s.startAt.toISOString());
    // A 09:00 start occupies 09:00-10:00 service + 15min buffer = busy until 10:15, which overlaps
    // the 10:00-10:30 reservation, so 09:00 must be excluded even though the service itself (ending
    // 10:00) wouldn't have overlapped.
    expect(slots).not.toContain('2026-06-01T09:00:00.000Z');
  });
});

describe('computeAvailability — booking notice and horizon', () => {
  it('excludes slots before the minimum notice window', () => {
    const input = baseInput({
      now: new Date('2026-06-01T08:00:00.000Z'),
      minNoticeMinutes: 120, // earliest bookable is 10:00
      employees: [
        baseEmployee({
          workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
        }),
      ],
    });
    const slots = computeAvailability(input).map((s) => s.startAt.toISOString());
    expect(slots).toEqual(['2026-06-01T10:00:00.000Z']);
  });

  it('excludes slots beyond the maximum advance booking horizon', () => {
    const input = baseInput({
      now: new Date('2026-06-01T00:00:00.000Z'),
      rangeStart: new Date('2026-06-01T00:00:00.000Z'),
      rangeEnd: new Date('2026-06-15T00:00:00.000Z'),
      maxAdvanceDays: 1, // only 2026-06-01 and the first hour of 06-02 are bookable
      employees: [
        baseEmployee({
          workingSchedule: [
            { weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 10 * 60 },
            { weekday: 2, startMinuteOfDay: 9 * 60, endMinuteOfDay: 10 * 60 },
          ],
        }),
      ],
    });
    const slots = computeAvailability(input).map((s) => s.startAt.toISOString());
    // Monday's block (06-01) is within the 1-day horizon; Tuesday's (06-02, 9am) is not (horizon
    // ends 2026-06-02T00:00:00.000Z).
    expect(slots).toEqual(['2026-06-01T09:00:00.000Z']);
  });

  it('returns no slots when the notice window already exceeds the horizon', () => {
    const input = baseInput({
      now: new Date('2026-06-01T00:00:00.000Z'),
      minNoticeMinutes: 60 * 24 * 40, // 40 days
      maxAdvanceDays: 30,
      employees: [
        baseEmployee({
          workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
        }),
      ],
    });
    expect(computeAvailability(input)).toEqual([]);
  });
});

describe('computeAvailability — multiple employees and "any stylist"', () => {
  it('returns slots per-employee for computeAvailability', () => {
    const input = baseInput({
      employees: [
        baseEmployee({
          employeeId: 'emp-a',
          workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 10 * 60 }],
        }),
        baseEmployee({
          employeeId: 'emp-b',
          workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 10 * 60 }],
        }),
      ],
    });
    const slots = computeAvailability(input);
    expect(slots.map((s) => s.employeeId).sort()).toEqual(['emp-a', 'emp-b']);
  });

  it('dedupes identical start times across employees for computeAnyStylistAvailability', () => {
    const input = baseInput({
      employees: [
        baseEmployee({
          employeeId: 'emp-a',
          workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 10 * 60 }],
        }),
        baseEmployee({
          employeeId: 'emp-b',
          workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 10 * 60 }],
        }),
      ],
    });
    const slots = computeAnyStylistAvailability(input);
    expect(slots).toHaveLength(1);
    expect(slots[0]?.startAt.toISOString()).toBe('2026-06-01T09:00:00.000Z');
  });
});

describe('computeAvailability — timezone and DST', () => {
  it('interprets working-schedule minute-of-day in the salon timezone, not UTC', () => {
    const input = baseInput({
      salonTimezone: 'America/New_York', // UTC-4 in June (EDT)
      employees: [
        baseEmployee({
          workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 10 * 60 }],
        }),
      ],
    });
    const slots = computeAvailability(input).map((s) => s.startAt.toISOString());
    expect(slots[0]).toBe('2026-06-01T13:00:00.000Z'); // 09:00 EDT = 13:00 UTC
  });

  it('produces correct UTC slots across a spring-forward transition day', () => {
    // 2026-03-08 is the US spring-forward date; 09:00-11:00 local is EDT (UTC-4) since it's after
    // the 2am transition.
    const input = baseInput({
      salonTimezone: 'America/New_York',
      now: new Date('2026-03-01T00:00:00.000Z'),
      rangeStart: new Date('2026-03-08T00:00:00.000Z'),
      rangeEnd: new Date('2026-03-09T00:00:00.000Z'),
      employees: [
        baseEmployee({
          workingSchedule: [{ weekday: 0, startMinuteOfDay: 9 * 60, endMinuteOfDay: 10 * 60 }],
        }),
      ],
    });
    const slots = computeAvailability(input).map((s) => s.startAt.toISOString());
    expect(slots[0]).toBe('2026-03-08T13:00:00.000Z'); // 09:00 EDT = 13:00 UTC, not 14:00
  });

  it('produces correct UTC slots across a fall-back transition day', () => {
    // 2026-11-01 is the US fall-back date (2am local). A 9am block that same day is already past
    // the transition, so it's EST (UTC-5), not EDT — a common off-by-one-day mistake to avoid.
    const input = baseInput({
      salonTimezone: 'America/New_York',
      now: new Date('2026-10-25T00:00:00.000Z'),
      rangeStart: new Date('2026-11-01T00:00:00.000Z'),
      rangeEnd: new Date('2026-11-02T00:00:00.000Z'),
      employees: [
        baseEmployee({
          workingSchedule: [{ weekday: 0, startMinuteOfDay: 9 * 60, endMinuteOfDay: 10 * 60 }],
        }),
      ],
    });
    const slots = computeAvailability(input).map((s) => s.startAt.toISOString());
    expect(slots[0]).toBe('2026-11-01T14:00:00.000Z'); // 09:00 EST = 14:00 UTC
  });
});

describe('isEmployeeSlotAvailable — single-instant re-check', () => {
  const baseSingleCheck = {
    salonTimezone: 'UTC',
    now: new Date('2026-06-01T00:00:00.000Z'),
    serviceDurationMinutes: 60,
    bufferMinutes: 0,
    minNoticeMinutes: 0,
    maxAdvanceDays: 30,
  };

  it('accepts an exact instant that falls within a working block, off the 15min grid', () => {
    const employee = baseEmployee({
      workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
    });
    const available = isEmployeeSlotAvailable({
      ...baseSingleCheck,
      employee,
      candidateStart: new Date('2026-06-01T09:07:00.000Z'), // not on a 15min grid boundary
    });
    expect(available).toBe(true);
  });

  it('rejects an instant outside any working block', () => {
    const employee = baseEmployee({
      workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
    });
    const available = isEmployeeSlotAvailable({
      ...baseSingleCheck,
      employee,
      candidateStart: new Date('2026-06-01T11:30:00.000Z'), // after the block ends
    });
    expect(available).toBe(false);
  });

  it('rejects an instant overlapping a blocking reservation', () => {
    const employee = baseEmployee({
      workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
      blockingReservations: [
        {
          startAt: new Date('2026-06-01T09:30:00.000Z'),
          endAt: new Date('2026-06-01T10:00:00.000Z'),
        },
      ],
    });
    const available = isEmployeeSlotAvailable({
      ...baseSingleCheck,
      employee,
      candidateStart: new Date('2026-06-01T09:00:00.000Z'), // 09:00-10:00 overlaps 09:30-10:00
    });
    expect(available).toBe(false);
  });

  it('rejects an inactive or ineligible employee regardless of schedule', () => {
    const workingSchedule = [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }];
    const candidateStart = new Date('2026-06-01T09:00:00.000Z');

    expect(
      isEmployeeSlotAvailable({
        ...baseSingleCheck,
        employee: baseEmployee({ isActive: false, workingSchedule }),
        candidateStart,
      }),
    ).toBe(false);
    expect(
      isEmployeeSlotAvailable({
        ...baseSingleCheck,
        employee: baseEmployee({ isEligibleForService: false, workingSchedule }),
        candidateStart,
      }),
    ).toBe(false);
  });

  it('rejects an instant before the minimum notice window', () => {
    const employee = baseEmployee({
      workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
    });
    const available = isEmployeeSlotAvailable({
      ...baseSingleCheck,
      employee,
      minNoticeMinutes: 600, // earliest bookable is 10:00 (now=00:00 + 10h)
      candidateStart: new Date('2026-06-01T09:00:00.000Z'),
    });
    expect(available).toBe(false);
  });

  it('rejects an instant beyond the maximum advance horizon', () => {
    const employee = baseEmployee({
      workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
    });
    const available = isEmployeeSlotAvailable({
      ...baseSingleCheck,
      employee,
      maxAdvanceDays: 1,
      candidateStart: new Date('2026-06-05T09:00:00.000Z'),
    });
    expect(available).toBe(false);
  });

  it('correctly interprets the candidate instant in the salon timezone', () => {
    const employee = baseEmployee({
      workingSchedule: [{ weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 11 * 60 }],
    });
    const available = isEmployeeSlotAvailable({
      ...baseSingleCheck,
      salonTimezone: 'America/New_York',
      employee,
      candidateStart: new Date('2026-06-01T13:00:00.000Z'), // 09:00 EDT
    });
    expect(available).toBe(true);
  });
});
