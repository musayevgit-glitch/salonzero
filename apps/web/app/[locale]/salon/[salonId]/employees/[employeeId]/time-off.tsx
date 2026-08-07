'use client';

import { Alert, Button, IconButton, Input, useToast } from '@salonomia/ui';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../../lib/api-client';

interface TimeOffEntry {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}

interface ConflictingReservation {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function TimeOffEditor({ salonId, employeeId }: { salonId: string; employeeId: string }) {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<TimeOffEntry[] | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictingReservation[] | null>(null);

  const basePath = `/salons/${salonId}/employees/${employeeId}/time-off`;

  function load() {
    apiFetch<TimeOffEntry[]>(basePath)
      .then(setEntries)
      .catch(() => setEntries([]));
  }

  useEffect(load, [salonId, employeeId]);

  async function submit(acknowledgeConflicts: boolean) {
    if (!start || !end) return;
    setSubmitting(true);
    setError(null);
    try {
      // Input times are treated as the admin's own local time, converted directly to UTC —
      // there is no SALON_ADMIN-accessible endpoint to read the salon's own timezone today
      // (GET /salons/:salonId is SUPERADMIN-only), so salon-local and admin-local are assumed
      // to match. Documented as a known simplification, not a silent gap.
      const body: Record<string, unknown> = {
        startAt: new Date(start).toISOString(),
        endAt: new Date(end).toISOString(),
      };
      if (reason) body.reason = reason;
      if (acknowledgeConflicts) body.acknowledgeConflicts = true;

      await apiFetch(basePath, { method: 'POST', body: JSON.stringify(body) });
      setStart('');
      setEnd('');
      setReason('');
      setConflicts(null);
      showToast('Time off added');
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as { conflicts?: ConflictingReservation[] } | undefined;
        if (body?.conflicts?.length) {
          setConflicts(body.conflicts);
          setError(
            'This overlaps existing reservations. Review them below, then confirm to proceed anyway.',
          );
          return;
        }
      }
      setError(err instanceof ApiError ? err.message : 'Could not add this time-off period.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(entryId: string) {
    try {
      await apiFetch(`${basePath}/${entryId}`, { method: 'DELETE' });
      load();
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : 'Could not remove this time-off period.',
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

      {conflicts ? (
        <div className="rounded-[var(--radius-md)] border border-danger p-3 text-sm">
          <p className="font-medium text-text-primary">Conflicting reservations:</p>
          <ul className="mt-2 flex flex-col gap-1">
            {conflicts.map((c) => (
              <li key={c.id}>
                {formatDateTime(c.startAt)} – {formatDateTime(c.endAt)} ({c.status})
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="destructive"
            className="mt-3"
            loading={submitting}
            disabled={submitting}
            onClick={() => submit(true)}
          >
            Add time off anyway
          </Button>
        </div>
      ) : null}

      {entries.length === 0 ? (
        <p className="text-sm text-text-secondary">No time off scheduled.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border p-3 text-sm"
            >
              <span>
                {formatDateTime(entry.startAt)} – {formatDateTime(entry.endAt)}
                {entry.reason ? ` — ${entry.reason}` : ''}
              </span>
              <IconButton
                label={`Remove time off ${formatDateTime(entry.startAt)}`}
                icon={<span aria-hidden="true">✕</span>}
                onClick={() => handleRemove(entry.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setConflicts(null);
          submit(false);
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="datetime-local"
            aria-label="Time off start"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
          <span className="self-center text-text-secondary">to</span>
          <Input
            type="datetime-local"
            aria-label="Time off end"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
        </div>
        <Input
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button type="submit" loading={submitting} disabled={submitting}>
          Add time off
        </Button>
      </form>
    </div>
  );
}
