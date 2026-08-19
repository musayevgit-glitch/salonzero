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
}: {
  /** Current status, or `ALL_STATUSES` when unfiltered. */
  value: string;
  label: string;
  options: { value: string; label: string }[];
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
          startTransition(() => {
            // Changing the filter always returns to page 1.
            router.replace(
              next === ALL_STATUSES
                ? '/account/reservations'
                : `/account/reservations?status=${encodeURIComponent(next)}`,
            );
          });
        }}
        options={options}
      />
    </div>
  );
}
