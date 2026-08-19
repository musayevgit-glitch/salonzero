'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useBookingContext } from '../_components/BookingContext';
import { BookingCTAButton, BookingPageShell } from '../_components/BookingPageShell';
import { formatMoney } from '../../../../../../lib/format-money';
import { formatLongDate, formatMonthYear } from '../../../../../../lib/format-date';
import { getInitials } from '../../../../../../lib/initials';

interface Slot {
  startAt: string;
  endAt: string;
}

interface AvailabilityResponse {
  date: string;
  timezone: string;
  slots: Slot[];
}

const API_URL = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');

/* ── Helpers ─────────────────────────────────────────────── */
function toLocalDateString(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: timezone,
  }).formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value || '1970';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

function formatTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('az-AZ', {
    hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false,
  }).format(new Date(iso));
}

function buildDates(timezone: string, maxAdvanceDays = 60): Date[] {
  const todayStr = toLocalDateString(new Date(), timezone);
  const today = new Date(todayStr);
  return Array.from({ length: maxAdvanceDays }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/* Build a calendar month grid (6 rows × 7 cols) */
function buildCalendarGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  // Monday = 0 … Sunday = 6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

function formatDateLocale(date: Date, locale: string): string {
  return formatLongDate(date, locale);
}

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={dir === 'left' ? 'M10 4L6 8l4 4' : 'M6 4l4 4-4 4'}
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 2v2M9 2v2M2 6.5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6" stroke="#7c3aed" strokeWidth="1.3" />
      <path d="M7 6.5v3.5M7 4.5v.5" stroke="#7c3aed" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/* ── Component ───────────────────────────────────────────── */
export default function DatetimeStep() {
  const { salon, draft, draftLoaded, setStartAt, setHoldId } = useBookingContext();
  const router = useRouter();
  const t = useTranslations('booking');
  const tc = useTranslations('common');
  const locale = useLocale();

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [holdState, setHoldState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [holdError, setHoldError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (draftLoaded && !draft.serviceId) {
      router.replace(`/salons/${salon.slug}/book/service`);
    }
  }, [draftLoaded, draft.serviceId, router, salon.slug]);

  const timezone = salon.timezone;
  const maxAdvanceDays = salon.bookingPolicySummary?.maxAdvanceDays ?? 60;

  /* Compute valid date range */
  const todayStr = toLocalDateString(today, timezone);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
  const maxDateStr = toLocalDateString(maxDate, timezone);

  const [bulkAvailability, setBulkAvailability] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!draftLoaded || !draft.serviceId) return;
    const params = new URLSearchParams({
      serviceId: draft.serviceId,
      startDate: todayStr,
      endDate: maxDateStr,
    });
    if (draft.employeeId) params.set('employeeId', draft.employeeId);

    fetch(`${API_URL}/public/salons/${salon.slug}/availability-bulk?${params}`)
      .then((res) => res.json())
      .then((data) => setBulkAvailability(data))
      .catch((err) => console.error('Failed to load bulk availability:', err));
  }, [draftLoaded, draft.serviceId, draft.employeeId, salon.slug, todayStr, maxDateStr]);

  const fetchSlots = useCallback(async (date: string) => {
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
      const res = await fetch(`${API_URL}/public/salons/${salon.slug}/availability?${params}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(t('slotsLoadError'));
      const data = (await res.json()) as AvailabilityResponse;
      setSlots(data.slots);
      setLoadState('idle');
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return;
      setErrorMsg(t('loadingSlotsError'));
      setLoadState('error');
    }
  }, [draft.serviceId, draft.employeeId, salon.slug]);

  function handleDateSelect(date: Date) {
    const dateStr = toLocalDateString(date, timezone);
    if (dateStr < todayStr || dateStr > maxDateStr) return;
    setSelectedDate(dateStr);
    void fetchSlots(dateStr);
  }

  function handleSlotSelect(startAt: string) {
    setStartAt(startAt);
  }

  if (!draftLoaded || !draft.serviceId) return null;

  const selectedService = [
    ...salon.serviceCategories.flatMap((c) => c.services),
    ...salon.uncategorizedServices,
  ].find((s) => s.id === draft.serviceId);

  const selectedEmployee = draft.employeeId
    ? salon.employees.find((e) => e.id === draft.employeeId)
    : null;

  /* Calendar grid */
  const grid = buildCalendarGrid(calYear, calMonth);
  const monthLabel = formatMonthYear(new Date(calYear, calMonth, 1), locale);
  const weekdayHeaders = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, i + 1))
  );

  const prevMonthDisabled = calYear === today.getFullYear() && calMonth === today.getMonth();
  function goPrevMonth() {
    if (prevMonthDisabled) return;
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }
  function goNextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T12:00:00') : null;

  async function handleContinue() {
    if (!draft.startAt || !draft.serviceId) return;
    setHoldState('loading');
    setHoldError('');
    try {
      if (draft.holdId) {
        await fetch(`/api/reservations/slot-holds/${draft.holdId}`, { method: 'DELETE' });
      }

      // "Any stylist" bookings have no employee to hold against. The reservation endpoint
      // re-verifies availability inside its transaction, so skipping the hold is safe —
      // it only means the slot is not reserved during checkout.
      if (!draft.employeeId) {
        setHoldId(undefined);
        setHoldState('idle');
        router.push(`/salons/${salon.slug}/book/summary`);
        return;
      }

      const slot = slots.find((s) => s.startAt === draft.startAt);
      if (!slot) throw new Error('slot_not_found');

      const res = await fetch('/api/reservations/slot-holds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: salon.id,
          employeeId: draft.employeeId,
          startAt: draft.startAt,
          endAt: slot.endAt,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? 'hold_failed');
      }

      const holdData = (await res.json()) as { id: string; expiresAt: string };
      setHoldId(holdData.id);
      setHoldState('idle');
      router.push(`/salons/${salon.slug}/book/summary`);
    } catch (err) {
      setHoldState('error');
      setHoldError(err instanceof Error && err.message !== 'slot_not_found' && err.message !== 'hold_failed'
        ? err.message
        : t('slotNoLongerAvailable'));
    }
  }

  return (
    <BookingPageShell
      title={t('selectDateTime')}
      backHref={`/salons/${salon.slug}/book/stylist`}
      backLabel={t('backToStylist')}
      footer={
        <BookingCTAButton
          label={holdState === 'loading' ? t('holdingSlot') : t('continueBtn')}
          disabled={!draft.startAt || holdState === 'loading'}
          onClick={() => void handleContinue()}
        />
      }
    >
      {/* Summary card (stylist + service) */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e4d4f4',
          borderRadius: 14,
          padding: '0.875rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          boxShadow: '0 1px 4px rgba(30,27,46,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: '#f3e8ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontWeight: 700, color: '#7c3aed', fontSize: '1rem',
          }}>
            {selectedEmployee ? getInitials(selectedEmployee.fullName) : '✦'}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e1b2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedEmployee?.fullName ?? t('anyStylist')}
            </p>
            <p style={{ fontSize: '0.72rem', color: '#6b5d8a', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedService?.name ?? t('serviceName')}
              {selectedService ? ` · ${formatMoney(selectedService.priceAmount)}` : ''}
              {/* Duration comes from the selected service — slots are generated for exactly this length. */}
              {selectedService ? ` · ${selectedService.durationMinutes} ${t('min')}` : ''}
            </p>
          </div>
        </div>
        <a
          href={`/salons/${salon.slug}/book/service`}
          style={{
            flexShrink: 0,
            padding: '0.3rem 0.75rem',
            borderRadius: 8,
            border: '1px solid #e4d4f4',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#7c3aed',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {t('editService')}
        </a>
      </div>

      {/* Calendar section */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b2e', marginBottom: '0.875rem' }}>
        {t('selectDate')}
      </h2>

      <div
        style={{
          background: 'white',
          border: '1px solid #e4d4f4',
          borderRadius: 16,
          padding: '1rem',
          marginBottom: '1.25rem',
          boxShadow: '0 1px 4px rgba(30,27,46,0.05)',
        }}
      >
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={goPrevMonth}
            disabled={prevMonthDisabled}
            aria-label={t('prevMonth')}
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #e4d4f4',
              background: prevMonthDisabled ? '#faf5ff' : 'white',
              color: prevMonthDisabled ? '#c5bbb2' : '#1e1b2e',
              cursor: prevMonthDisabled ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronIcon dir="left" />
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e1b2e' }}>{monthLabel}</span>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label={t('nextMonth')}
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #e4d4f4',
              background: 'white', color: '#1e1b2e', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronIcon dir="right" />
          </button>
        </div>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.5rem' }}>
          {weekdayHeaders.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 600, color: '#7c6fa0', padding: '0.25rem 0' }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        {grid.map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
            {row.map((day, ci) => {
              if (!day) return <div key={ci} />;
              const dateStr = toLocalDateString(day, timezone);
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;
              const isBeyond = dateStr > maxDateStr;
              const isDisabled = isPast || isBeyond;
              const isSelected = dateStr === selectedDate;

              const hasSlots = bulkAvailability[dateStr];
              const showDot = !isDisabled && bulkAvailability[dateStr] !== undefined;
              const dotColor = hasSlots ? '#4caf50' : '#f44336';

              return (
                <button
                  key={ci}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleDateSelect(day)}
                  aria-label={formatDateLocale(day, locale)}
                  aria-pressed={isSelected}
                  style={{
                    height: 40, borderRadius: 8, border: isSelected ? '1.5px solid #4caf50' : 'none',
                    background: isSelected ? 'rgba(76, 175, 80, 0.15)' : isToday ? '#f3e8ff' : 'transparent',
                    color: isSelected ? '#1b4332' : isDisabled ? '#d5ccc5' : isToday ? '#7c3aed' : '#1e1b2e',
                    fontWeight: isSelected || isToday ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '2px',
                    position: 'relative',
                  }}
                >
                  <span style={{ marginTop: showDot ? '2px' : '0' }}>{day.getDate()}</span>
                  {showDot && (
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor }} />
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Selected date label */}
        {selectedDate && selectedDateObj && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid #e4d4f4', color: '#6b5d8a', fontSize: '0.78rem' }}>
            <CalendarIcon />
            <span>{t('selectedDate')}: <strong style={{ color: '#1e1b2e' }}>{formatDateLocale(selectedDateObj, locale)}</strong></span>
          </div>
        )}
      </div>

      {/* Time slots section */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b2e', marginBottom: '0.875rem' }}>
        {t('selectTime')}
      </h2>

      {!selectedDate && (
        <p style={{ color: '#7c6fa0', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
          {t('selectDateFirst')}
        </p>
      )}

      {selectedDate && loadState === 'loading' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ height: 44, borderRadius: 10, background: '#f0e8e0', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {selectedDate && loadState === 'error' && (
        <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 12, padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '0.82rem', color: '#6b5d8a' }}>{errorMsg}</p>
          <button type="button" onClick={() => void fetchSlots(selectedDate)} style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}>
            {tc('retry')}
          </button>
        </div>
      )}

      {selectedDate && loadState === 'idle' && slots.length === 0 && (
        <p style={{ color: '#7c6fa0', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
          {t('noSlotsAvailable')}
        </p>
      )}

      {selectedDate && loadState === 'idle' && slots.length > 0 && (
        <>
          <div
            style={{
              maxHeight: 180,
              overflowY: 'auto',
              border: '1.5px dashed #e4d4f4',
              borderRadius: 14,
              padding: '0.6rem',
              background: '#fcfbfa',
              marginBottom: '1rem',
            }}
          >
            <div
              role="listbox"
              aria-label="Mövcud saatlar"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}
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
                    style={{
                      height: 44,
                      borderRadius: 10,
                      border: isSelected ? '2px solid #7c3aed' : '1.5px solid #e4d4f4',
                      background: isSelected ? '#7c3aed' : 'white',
                      color: isSelected ? 'white' : '#1e1b2e',
                      fontSize: '0.88rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(201,164,96,0.3)' : '0 1px 2px rgba(30,27,46,0.04)',
                    }}
                  >
                    {formatTime(slot.startAt, timezone)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.875rem' }}>
            {[
              { dot: '#4caf50', label: t('slotsAvailable') },
              { dot: '#7c3aed', label: t('slotsSelected') },
              { dot: '#c5bbb2', label: t('slotsFull') },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#6b5d8a' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
                {item.label}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Info note */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem',
          padding: '0.75rem',
          borderRadius: 12,
          background: '#fffbf2',
          border: '1px solid #f0e4c0',
          marginBottom: '0.5rem',
        }}
      >
        <span style={{ flexShrink: 0, marginTop: '0.05rem' }}><InfoIcon /></span>
        <p style={{ fontSize: '0.75rem', color: '#8a7355', lineHeight: 1.5 }}>
          {t('slotBlockedNote')}
        </p>
      </div>

      {holdState === 'error' && holdError && (
        <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 12, padding: '0.75rem', marginTop: '0.5rem' }}>
          <p style={{ fontSize: '0.82rem', color: '#dc2626' }}>{holdError}</p>
        </div>
      )}
    </BookingPageShell>
  );
}
