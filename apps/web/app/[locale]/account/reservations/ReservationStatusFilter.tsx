'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dropdown } from '../../../_components/Dropdown';

export const ALL_STATUSES = '__all__';

/**
 * Status filter for the customer's reservation list.
 *
 * A dropdown rather than a pill row: the status set grows over time (PENDING, CONFIRMED,
 * CHECKED_IN, COMPLETED, NO_SHOW, REJECTED, two cancellation variants…) and a horizontal pill
 * strip stops being usable — and stops fitting on mobile — well before that list is complete.
 * "All" is the default.
 */
export function ReservationStatusFilter({
  value,
  label,
  options,
  tab,
}: {
  /** Current status, or `ALL_STATUSES` when unfiltered. */
  value: string;
  label: string;
  options: { value: string; label: string }[];
  /** Upcoming/past tab to preserve across a filter change. */
  tab?: 'upcoming' | 'past';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ maxWidth: 280 }}>
      <Dropdown
        label={label}
        value={value}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value;
          // Changing the filter always returns to page 1, but must not knock the reader out
          // of the tab they are reading.
          const params = new URLSearchParams();
          if (tab === 'past') params.set('tab', 'past');
          if (next !== ALL_STATUSES) params.set('status', next);
          const qs = params.toString();
          startTransition(() => {
            router.replace(qs ? `/account/reservations?${qs}` : '/account/reservations');
          });
        }}
        options={options}
      />
    </div>
  );
}
