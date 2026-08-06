'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '../../../../lib/api-client';
import Link from 'next/link';

interface ReservationDetail {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  priceAmount: number;
  currency: string;
  customerNote: string | null;
  service: { id: string; name: string; durationMinutes: number };
  employee: { id: string; fullName: string } | null;
  salon: {
    name: string;
    slug: string;
    timezone: string;
    bookingPolicy: {
      cancellationWindowHours: number;
      rescheduleWindowHours: number;
    } | null;
  };
  canCancel: boolean;
  canReschedule: boolean;
}

interface AvailabilitySlot {
  startAt: string;
  endAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  CHECKED_IN: 'Checked in',
  COMPLETED: 'Completed',
  NO_SHOW: 'No show',
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100);
}

function formatDateTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  }).format(new Date(iso));
}

function toLocalDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
}

function buildDates(timezone: string, maxDays: number) {
  const dates: Date[] = [];
  const base = new Date();
  for (let i = 0; i < maxDays; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function ReservationDetailPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const router = useRouter();
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancel state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Resolve params
  useEffect(() => {
    params.then((p) => setReservationId(p.reservationId));
  }, [params]);

  // Load reservation
  useEffect(() => {
    if (!reservationId) return;
    apiFetch<ReservationDetail>(`/customer/reservations/${reservationId}`)
      .then((r) => {
        setReservation(r);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/account/reservations/${reservationId}`);
        } else {
          setError('Failed to load reservation.');
          setLoading(false);
        }
      });
  }, [reservationId, router]);

  // Load slots when reschedule date changes
  useEffect(() => {
    if (!reservation || !rescheduleDate) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setSlotsLoading(true);
    setSlotsError(null);
    setSlots([]);

    const p = new URLSearchParams({
      serviceId: reservation.service.id,
      date: rescheduleDate,
      ...(reservation.employee ? { employeeId: reservation.employee.id } : {}),
    });

    fetch(`${API_URL}/public/salons/${reservation.salon.slug}/availability?${p}`, {
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((data: { slots: AvailabilitySlot[] }) => {
        if (!ac.signal.aborted) {
          setSlots(data.slots ?? []);
          setSlotsLoading(false);
        }
      })
      .catch(() => {
        if (!ac.signal.aborted) {
          setSlotsError('Failed to load slots.');
          setSlotsLoading(false);
        }
      });

    return () => ac.abort();
  }, [reservation, rescheduleDate]);

  async function handleCancel() {
    if (!reservationId) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await apiFetch(`/reservations/${reservationId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      });
      router.push('/account/reservations');
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel.');
      setCancelling(false);
    }
  }

  async function handleReschedule(startAt: string) {
    if (!reservationId) return;
    setRescheduling(true);
    setRescheduleError(null);
    try {
      await apiFetch(`/reservations/${reservationId}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({ startAt }),
      });
      router.push('/account/reservations');
    } catch (err) {
      setRescheduleError(err instanceof Error ? err.message : 'Failed to reschedule.');
      setRescheduling(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 rounded bg-surface-raised" />
        <div className="h-40 rounded bg-surface-raised" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div>
        <p className="text-sm text-red-600 dark:text-red-400">{error ?? 'Reservation not found.'}</p>
        <Link href="/account/reservations" className="mt-3 inline-block text-sm text-accent underline">
          ← Back to reservations
        </Link>
      </div>
    );
  }

  const dates = reservation.canReschedule
    ? buildDates(
        reservation.salon.timezone,
        reservation.salon.bookingPolicy ? 90 : 30,
      )
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/account/reservations" className="text-sm text-text-secondary hover:text-text-primary">
          ← My reservations
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-text-primary">
          {reservation.service.name}
        </h1>
        <p className="text-sm text-text-secondary">{reservation.salon.name}</p>
      </div>

      <dl className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-border bg-surface-raised p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Status</dt>
          <dd className="font-medium text-text-primary">{STATUS_LABEL[reservation.status] ?? reservation.status}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Date &amp; time</dt>
          <dd className="text-right text-text-primary">
            {formatDateTime(reservation.startAt, reservation.salon.timezone)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Duration</dt>
          <dd className="text-text-primary">{reservation.service.durationMinutes} min</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Stylist</dt>
          <dd className="text-text-primary">
            {reservation.employee?.fullName ?? 'Any available stylist'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-secondary">Price</dt>
          <dd className="font-semibold text-text-primary">
            {formatMoney(reservation.priceAmount, reservation.currency)}
          </dd>
        </div>
        {reservation.customerNote && (
          <div className="flex flex-col gap-1">
            <dt className="text-text-secondary">Your note</dt>
            <dd className="text-text-primary">{reservation.customerNote}</dd>
          </div>
        )}
      </dl>

      {/* Cancel */}
      {reservation.canCancel && (
        <div>
          {!showCancelConfirm ? (
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="text-sm text-red-600 underline hover:text-red-700 dark:text-red-400"
            >
              Cancel this booking
            </button>
          ) : (
            <div className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Cancel this booking?
              </p>
              <div className="flex flex-col gap-1">
                <label htmlFor="cancel-reason" className="text-xs text-text-secondary">
                  Reason (optional)
                </label>
                <input
                  id="cancel-reason"
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  maxLength={500}
                  className="rounded border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              {cancelError && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                  {cancelError}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="text-sm text-text-secondary underline hover:text-text-primary"
                >
                  Keep booking
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reschedule */}
      {reservation.canReschedule && (
        <div>
          {!showReschedule ? (
            <button
              type="button"
              onClick={() => setShowReschedule(true)}
              className="text-sm text-accent underline hover:opacity-80"
            >
              Reschedule
            </button>
          ) : (
            <div className="flex flex-col gap-4 rounded-[var(--radius-sm)] border border-border bg-surface-raised p-4">
              <p className="text-sm font-medium text-text-primary">Select a new date &amp; time</p>

              {/* Date strip */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {dates.map((d) => {
                  const ds = toLocalDate(d, reservation.salon.timezone);
                  const active = ds === rescheduleDate;
                  return (
                    <button
                      key={ds}
                      type="button"
                      onClick={() => setRescheduleDate(ds)}
                      className={[
                        'flex min-w-[3.5rem] flex-col items-center rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs',
                        active
                          ? 'border-accent bg-accent text-white'
                          : 'border-border text-text-secondary hover:border-accent hover:text-text-primary',
                      ].join(' ')}
                    >
                      <span className="font-medium">
                        {new Intl.DateTimeFormat(undefined, {
                          day: 'numeric',
                          timeZone: reservation.salon.timezone,
                        }).format(d)}
                      </span>
                      <span>
                        {new Intl.DateTimeFormat(undefined, {
                          weekday: 'short',
                          timeZone: reservation.salon.timezone,
                        }).format(d)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Slots */}
              {!rescheduleDate && (
                <p className="text-sm text-text-secondary">Select a date to see available slots.</p>
              )}
              {rescheduleDate && slotsLoading && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded bg-surface" />
                  ))}
                </div>
              )}
              {rescheduleDate && !slotsLoading && slotsError && (
                <p className="text-sm text-red-600 dark:text-red-400">{slotsError}</p>
              )}
              {rescheduleDate && !slotsLoading && !slotsError && slots.length === 0 && (
                <p className="text-sm text-text-secondary">No slots available on this day.</p>
              )}
              {rescheduleDate && !slotsLoading && slots.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button
                      key={slot.startAt}
                      type="button"
                      disabled={rescheduling}
                      onClick={() => handleReschedule(slot.startAt)}
                      className="rounded-[var(--radius-sm)] border border-border px-2 py-2.5 text-sm font-medium text-text-primary hover:border-accent hover:text-accent disabled:opacity-60"
                    >
                      {new Intl.DateTimeFormat(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZone: reservation.salon.timezone,
                      }).format(new Date(slot.startAt))}
                    </button>
                  ))}
                </div>
              )}

              {rescheduleError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {rescheduleError}
                </p>
              )}

              <button
                type="button"
                onClick={() => setShowReschedule(false)}
                className="self-start text-sm text-text-secondary underline hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
