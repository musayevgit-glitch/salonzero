'use client';

import { Alert, Button, IconButton, Input, useToast } from '@salonomia/ui';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../../lib/api-client';

interface ScheduleEntry {
  id: string;
  weekday: number;
  startMinuteOfDay: number;
  endMinuteOfDay: number;
}

const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeStringToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

export function WorkingScheduleEditor({
  salonId,
  employeeId,
}: {
  salonId: string;
  employeeId: string;
}) {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<ScheduleEntry[] | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { start: string; end: string }>>({});
  const [addingWeekday, setAddingWeekday] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const basePath = `/salons/${salonId}/employees/${employeeId}/working-schedule`;

  function load() {
    apiFetch<ScheduleEntry[]>(basePath)
      .then(setEntries)
      .catch(() => setEntries([]));
  }

  useEffect(load, [salonId, employeeId]);

  async function handleAdd(weekday: number) {
    const draft = drafts[weekday] ?? { start: '09:00', end: '17:00' };
    const startMinuteOfDay = timeStringToMinutes(draft.start);
    const endMinuteOfDay = timeStringToMinutes(draft.end);
    if (startMinuteOfDay === null || endMinuteOfDay === null) return;

    setAddingWeekday(weekday);
    setError(null);
    try {
      await apiFetch(basePath, {
        method: 'POST',
        body: JSON.stringify({ weekday, startMinuteOfDay, endMinuteOfDay }),
      });
      setDrafts((prev) => ({ ...prev, [weekday]: { start: '09:00', end: '17:00' } }));
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add this interval.');
    } finally {
      setAddingWeekday(null);
    }
  }

  async function handleRemove(entryId: string) {
    try {
      await apiFetch(`${basePath}/${entryId}`, { method: 'DELETE' });
      load();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : 'Could not remove this interval.',
        'danger',
      );
    }
  }

  if (!entries) {
    return <p className="text-sm text-text-secondary">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert tone="danger" title={error} /> : null}

      {WEEKDAY_LABELS.map((label, weekday) => {
        const dayEntries = entries
          .filter((e) => e.weekday === weekday)
          .sort((a, b) => a.startMinuteOfDay - b.startMinuteOfDay);
        const draft = drafts[weekday] ?? { start: '09:00', end: '17:00' };

        return (
          <div
            key={weekday}
            className="flex flex-col gap-2 border-b border-border pb-4 last:border-0"
          >
            <h3 className="text-sm font-medium text-text-primary">{label}</h3>

            {dayEntries.length === 0 ? (
              <p className="text-sm text-text-secondary">No hours set.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {dayEntries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
                  >
                    <span>
                      {minutesToTimeString(entry.startMinuteOfDay)}–
                      {minutesToTimeString(entry.endMinuteOfDay)}
                    </span>
                    <IconButton
                      label={`Remove ${label} ${minutesToTimeString(entry.startMinuteOfDay)}–${minutesToTimeString(entry.endMinuteOfDay)}`}
                      icon={<span aria-hidden="true">✕</span>}
                      onClick={() => handleRemove(entry.id)}
                    />
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="time"
                aria-label={`${label} start time`}
                value={draft.start}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [weekday]: { ...draft, start: e.target.value },
                  }))
                }
                className="w-32"
              />
              <span className="text-text-secondary">to</span>
              <Input
                type="time"
                aria-label={`${label} end time`}
                value={draft.end}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [weekday]: { ...draft, end: e.target.value } }))
                }
                className="w-32"
              />
              <Button
                type="button"
                variant="secondary"
                loading={addingWeekday === weekday}
                disabled={addingWeekday === weekday}
                onClick={() => handleAdd(weekday)}
              >
                Add
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
