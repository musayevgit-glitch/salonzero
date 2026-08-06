'use client';

import { Alert, Button, IconButton, Input, Select, useToast } from '@salonomia/ui';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface BreakEntry {
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
  return Number(match[1]) * 60 + Number(match[2]);
}

export function BreaksEditor({ salonId, employeeId }: { salonId: string; employeeId: string }) {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<BreakEntry[] | null>(null);
  const [weekday, setWeekday] = useState('1');
  const [start, setStart] = useState('12:00');
  const [end, setEnd] = useState('13:00');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const basePath = `/salons/${salonId}/employees/${employeeId}/breaks`;

  function load() {
    apiFetch<BreakEntry[]>(basePath)
      .then(setEntries)
      .catch(() => setEntries([]));
  }

  useEffect(load, [salonId, employeeId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const startMinuteOfDay = timeStringToMinutes(start);
    const endMinuteOfDay = timeStringToMinutes(end);
    if (startMinuteOfDay === null || endMinuteOfDay === null) return;

    setAdding(true);
    setError(null);
    try {
      await apiFetch(basePath, {
        method: 'POST',
        body: JSON.stringify({ weekday: Number(weekday), startMinuteOfDay, endMinuteOfDay }),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add this break.');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(entryId: string) {
    try {
      await apiFetch(`${basePath}/${entryId}`, { method: 'DELETE' });
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not remove this break.', 'danger');
    }
  }

  if (!entries) {
    return <p className="text-sm text-text-secondary">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <Alert tone="danger" title={error} /> : null}

      {entries.length === 0 ? (
        <p className="text-sm text-text-secondary">No breaks set.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {[...entries]
            .sort((a, b) => a.weekday - b.weekday || a.startMinuteOfDay - b.startMinuteOfDay)
            .map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border p-3 text-sm"
              >
                <span>
                  {WEEKDAY_LABELS[entry.weekday]}, {minutesToTimeString(entry.startMinuteOfDay)}–
                  {minutesToTimeString(entry.endMinuteOfDay)}
                </span>
                <IconButton
                  label={`Remove ${WEEKDAY_LABELS[entry.weekday]} break ${minutesToTimeString(entry.startMinuteOfDay)}–${minutesToTimeString(entry.endMinuteOfDay)}`}
                  icon={<span aria-hidden="true">✕</span>}
                  onClick={() => handleRemove(entry.id)}
                />
              </li>
            ))}
        </ul>
      )}

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={handleAdd}>
        <Select
          value={weekday}
          onChange={(e) => setWeekday(e.target.value)}
          aria-label="Day"
          className="sm:max-w-40"
        >
          {WEEKDAY_LABELS.map((label, index) => (
            <option key={index} value={index}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          type="time"
          aria-label="Break start time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="w-32"
        />
        <span className="text-text-secondary">to</span>
        <Input
          type="time"
          aria-label="Break end time"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="w-32"
        />
        <Button type="submit" loading={adding} disabled={adding}>
          Add break
        </Button>
      </form>
    </div>
  );
}
