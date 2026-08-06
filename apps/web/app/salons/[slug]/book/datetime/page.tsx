'use client';

import { PublicShell } from '@salonomia/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBookingContext } from '../_components/BookingContext';
import { BookingStepper } from '../_components/BookingStepper';

interface Slot {
  startAt: string;
  endAt: string;
}

interface AvailabilityResponse {
  date: string;
  timezone: string;
  slots: Slot[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function formatTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(iso));
}

function formatLocalDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  }).format(date);
}

function toLocalDateString(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).format(date);
  return parts; // en-CA gives YYYY-MM-DD
}

function buildDates(timezone: string, maxAdvanceDays = 60): Date[] {
  const today = new Date(toLocalDateString(new Date(), timezone));
  return Array.from({ length: maxAdvanceDays }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function DatetimeStep() {
  const { salon, draft, draftLoaded, setStartAt } = useBookingContext();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // Guard: service must be selected
  useEffect(() => {
    if (draftLoaded && !draft.serviceId) {
      router.replace(`/salons/${salon.slug}/book/service`);
    }
  }, [draftLoaded, draft.serviceId, router, salon.slug]);

  const timezone = salon.timezone;
  const maxAdvanceDays = salon.bookingPolicySummary?.maxAdvanceDays ?? 60;
  const dates = buildDates(timezone, maxAdvanceDays);

  const fetchSlots = useCallback(
    async (date: string) => {
      if (!draft.serviceId) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoadState('loading');
      setSlots([]);
      setErrorMsg('');
      try {
        const params = new URLSearchParams({ serviceId: draft.serviceId, date });
        if (draft.employeeId) params.set('employeeId', draft.employeeId);
        const res = await fetch(
          `${API_URL}/public/salons/${salon.slug}/availability?${params}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error('Could not load availability.');
        const data = (await res.json()) as AvailabilityResponse;
        setSlots(data.slots);
        setLoadState('idle');
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setErrorMsg('Could not load time slots. Please try again.');
        setLoadState('error');
      }
    },
    [draft.serviceId, draft.employeeId, salon.slug],
  );

  function handleDateSelect(dateStr: string) {
    setSelectedDate(dateStr);
    void fetchSlots(dateStr);
  }

  function handleSlotSelect(startAt: string) {
    setStartAt(startAt);
    router.push(`/salons/${salon.slug}/book/summary`);
  }

  if (!draftLoaded || !draft.serviceId) return null;

  const selectedService = [
    ...salon.serviceCategories.flatMap((c) => c.services),
    ...salon.uncategorizedServices,
  ].find((s) => s.id === draft.serviceId);

  const selectedEmployee = draft.employeeId
    ? salon.employees.find((e) => e.id === draft.employeeId)
    : null;

  return (
    <PublicShell>
      <div className="mx-auto max-w-xl">
        <a
          href={`/salons/${salon.slug}/book/stylist`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          ← Back to stylist
        </a>

        <div className="mt-4">
          <BookingStepper />
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-text-primary">Choose a date &amp; time</h1>

        <p className="mt-1 text-sm text-text-secondary">
          Times shown in{' '}
          <span className="font-medium text-text-primary">{timezone}</span>
          {selectedService && (
            <>
              {' · '}
              {selectedService.name}
            </>
          )}
          {selectedEmployee && (
            <>
              {' · '}
              {selectedEmployee.fullName}
            </>
          )}
          {!selectedEmployee && draft.employeeId === undefined && ' · Any stylist'}
          {!draft.employeeId && draft.employeeId === null && ' · Any stylist'}
        </p>

        {/* Date selector — horizontal scroll, min 44px touch targets */}
        <div className="mt-5 -mx-4 overflow-x-auto px-4">
          <div className="flex gap-2 pb-2" role="listbox" aria-label="Select date">
            {dates.map((d) => {
              const dateStr = toLocalDateString(d, timezone);
              const label = formatLocalDate(d, timezone);
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={dateStr}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleDateSelect(dateStr)}
                  className={`flex min-h-[3rem] min-w-[5rem] shrink-0 flex-col items-center justify-center rounded-[var(--radius-sm)] border px-3 py-2 text-center text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    isSelected
                      ? 'border-accent bg-accent text-white'
                      : 'border-border bg-surface-raised hover:border-accent/50'
                  }`}
                >
                  <span className="font-medium leading-tight">
                    {new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: timezone }).format(d)}
                  </span>
                  <span className="text-xs leading-tight opacity-80">
                    {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: timezone }).format(d)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Slot grid */}
        <div className="mt-4">
          {!selectedDate && (
            <p className="text-sm text-text-secondary">Select a date above to see available times.</p>
          )}

          {selectedDate && loadState === 'loading' && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-[var(--radius-sm)] bg-border" />
              ))}
            </div>
          )}

          {selectedDate && loadState === 'error' && (
            <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border p-4">
              <p className="flex-1 text-sm text-text-secondary">{errorMsg}</p>
              <button
                type="button"
                onClick={() => void fetchSlots(selectedDate)}
                className="shrink-0 text-sm font-medium text-accent underline"
              >
                Retry
              </button>
            </div>
          )}

          {selectedDate && loadState === 'idle' && slots.length === 0 && (
            <p className="text-sm text-text-secondary">
              No availability on this day.{' '}
              <span className="text-text-primary">Try another date.</span>
            </p>
          )}

          {selectedDate && loadState === 'idle' && slots.length > 0 && (
            <div
              className="grid grid-cols-3 gap-2 sm:grid-cols-4"
              role="listbox"
              aria-label="Available times"
            >
              {slots.map((slot) => {
                const isSelected = draft.startAt === slot.startAt;
                return (
                  <button
                    key={slot.startAt}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSlotSelect(slot.startAt)}
                    className={`min-h-[2.75rem] rounded-[var(--radius-sm)] border text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      isSelected
                        ? 'border-accent bg-accent text-white'
                        : 'border-border bg-surface-raised hover:border-accent/50'
                    }`}
                  >
                    {formatTime(slot.startAt, timezone)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
