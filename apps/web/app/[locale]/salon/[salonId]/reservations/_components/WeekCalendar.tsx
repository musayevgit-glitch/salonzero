'use client';

import { useMemo } from 'react';

export interface CalendarReservation {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  service: { id: string; name: string };
  employee: { id: string; fullName: string };
  customer: { id: string; fullName: string; email: string };
}

/** Status → block colours. Kept local so the calendar reads at a glance without a legend. */
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  PENDING: { bg: '#fef3c7', border: '#f59e0b', text: '#78350f' },
  CONFIRMED: { bg: '#dcfce7', border: '#22c55e', text: '#14532d' },
  CHECKED_IN: { bg: '#d1fae5', border: '#10b981', text: '#064e3b' },
  COMPLETED: { bg: '#e5e7eb', border: '#9ca3af', text: '#1f2937' },
  REJECTED: { bg: '#fee2e2', border: '#ef4444', text: '#7f1d1d' },
  CANCELLED_BY_CUSTOMER: { bg: '#fee2e2', border: '#ef4444', text: '#7f1d1d' },
  CANCELLED_BY_SALON: { bg: '#fee2e2', border: '#ef4444', text: '#7f1d1d' },
  NO_SHOW: { bg: '#fae8ff', border: '#a855f7', text: '#581c87' },
};

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;
const HOUR_HEIGHT = 56; // px per hour — one row of the time axis
const DAY_MS = 24 * 60 * 60 * 1000;

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Outlook-style weekly grid: a fixed time axis on the left, seven day columns, and reservation
 * blocks positioned by their start/end offsets within the day.
 *
 * Implemented with plain CSS grid + absolute positioning — no calendar library. Blocks that
 * overlap in the same column are split horizontally so none is fully hidden.
 */
export function WeekCalendar({
  weekStart,
  reservations,
  locale,
  onSelect,
  emptyLabel,
}: {
  /** Local midnight on the Monday of the displayed week. */
  weekStart: Date;
  reservations: CalendarReservation[];
  locale: string;
  onSelect?: (reservationId: string) => void;
  emptyLabel: string;
}) {
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  // Widen the axis when reservations fall outside normal hours, so nothing is clipped.
  const { startHour, endHour } = useMemo(() => {
    let min = DEFAULT_START_HOUR;
    let max = DEFAULT_END_HOUR;
    for (const r of reservations) {
      const s = new Date(r.startAt);
      const e = new Date(r.endAt);
      min = Math.min(min, s.getHours());
      max = Math.max(max, e.getHours() + (e.getMinutes() > 0 ? 1 : 0));
    }
    return { startHour: Math.max(0, min), endHour: Math.min(24, Math.max(max, min + 1)) };
  }, [reservations]);

  const hours = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
    [startHour, endHour],
  );
  const gridHeight = hours.length * HOUR_HEIGHT;

  // Bucket reservations by day index once, rather than filtering seven times per render.
  const byDay = useMemo(() => {
    const buckets: CalendarReservation[][] = Array.from({ length: 7 }, () => []);
    for (const r of reservations) {
      const start = new Date(r.startAt);
      const index = Math.floor(
        (new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() -
          weekStart.getTime()) /
          DAY_MS,
      );
      if (index >= 0 && index < 7) buckets[index]!.push(r);
    }
    for (const bucket of buckets) {
      bucket.sort((a, b) => a.startAt.localeCompare(b.startAt));
    }
    return buckets;
  }, [reservations, weekStart]);

  const now = new Date();
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const dayNumFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 760 }}>
        {/* Day headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '56px repeat(7, minmax(0, 1fr))',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div />
          {days.map((day) => {
            const isToday = sameLocalDay(day, now);
            return (
              <div
                key={day.toISOString()}
                style={{
                  padding: '0.5rem 0.25rem',
                  textAlign: 'center',
                  background: isToday ? 'var(--color-accent-muted)' : 'transparent',
                  borderLeft: '1px solid var(--color-border)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  {weekdayFmt.format(day)}
                </div>
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: isToday ? 700 : 600,
                    color: isToday ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  }}
                >
                  {dayNumFmt.format(day)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time axis + day columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '56px repeat(7, minmax(0, 1fr))',
            position: 'relative',
          }}
        >
          {/* Hour labels */}
          <div style={{ position: 'relative', height: gridHeight }}>
            {hours.map((hour, i) => (
              <div
                key={hour}
                style={{
                  position: 'absolute',
                  top: i * HOUR_HEIGHT,
                  right: 6,
                  fontSize: '0.68rem',
                  color: 'var(--color-text-secondary)',
                  transform: 'translateY(-0.35em)',
                }}
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {days.map((day, dayIndex) => {
            const isToday = sameLocalDay(day, now);
            const dayReservations = byDay[dayIndex] ?? [];
            return (
              <div
                key={day.toISOString()}
                style={{
                  position: 'relative',
                  height: gridHeight,
                  borderLeft: '1px solid var(--color-border)',
                  background: isToday ? 'color-mix(in srgb, var(--color-accent) 6%, transparent)' : 'transparent',
                }}
              >
                {/* Hour gridlines */}
                {hours.map((hour, i) => (
                  <div
                    key={hour}
                    style={{
                      position: 'absolute',
                      top: i * HOUR_HEIGHT,
                      left: 0,
                      right: 0,
                      height: HOUR_HEIGHT,
                      borderTop: '1px solid var(--color-border)',
                      opacity: 0.6,
                    }}
                  />
                ))}

                {dayReservations.map((reservation) => {
                  const start = new Date(reservation.startAt);
                  const end = new Date(reservation.endAt);
                  const startMin = minutesSinceMidnight(start) - startHour * 60;
                  const endMin = minutesSinceMidnight(end) - startHour * 60;
                  const top = (startMin / 60) * HOUR_HEIGHT;
                  const height = Math.max(20, ((endMin - startMin) / 60) * HOUR_HEIGHT);

                  // Split the column between blocks that overlap this one in time.
                  const overlapping = dayReservations.filter((other) => {
                    const os = new Date(other.startAt).getTime();
                    const oe = new Date(other.endAt).getTime();
                    return os < end.getTime() && oe > start.getTime();
                  });
                  const slotCount = Math.max(1, overlapping.length);
                  const slotIndex = overlapping.findIndex((o) => o.id === reservation.id);
                  const widthPct = 100 / slotCount;

                  const colors = STATUS_COLORS[reservation.status] ?? STATUS_COLORS.COMPLETED!;

                  return (
                    <button
                      key={reservation.id}
                      type="button"
                      onClick={() => onSelect?.(reservation.id)}
                      title={`${timeFmt.format(start)}–${timeFmt.format(end)} · ${reservation.customer.fullName} · ${reservation.service.name} · ${reservation.employee.fullName}`}
                      style={{
                        position: 'absolute',
                        top,
                        height,
                        left: `calc(${slotIndex * widthPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        background: colors.bg,
                        borderLeft: `3px solid ${colors.border}`,
                        borderRadius: 4,
                        color: colors.text,
                        padding: '2px 4px',
                        textAlign: 'left',
                        fontSize: '0.65rem',
                        lineHeight: 1.25,
                        overflow: 'hidden',
                        cursor: onSelect ? 'pointer' : 'default',
                        font: 'inherit',
                        fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ display: 'block', fontWeight: 700, fontSize: '0.65rem' }}>
                        {timeFmt.format(start)} {reservation.customer.fullName}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.62rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {reservation.service.name}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.6rem',
                          opacity: 0.8,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {reservation.employee.fullName}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {reservations.length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              padding: '1.5rem',
              fontSize: '0.85rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            {emptyLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
