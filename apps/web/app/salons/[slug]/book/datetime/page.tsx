'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBookingContext } from '../_components/BookingContext';
import { BookingCTAButton, BookingPageShell } from '../_components/BookingPageShell';

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

/* ── Helpers ─────────────────────────────────────────────── */
function toLocalDateString(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: timezone,
  }).format(date);
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

const AZ_WEEKDAYS = ['B.e', 'Ç.a', 'Ç.', 'C.a', 'C.', 'Ş.', 'B'];
const AZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
const AZ_WEEKDAYS_FULL = ['Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə', 'Bazar'];

function formatAzDate(date: Date): string {
  const day = date.getDate();
  const month = AZ_MONTHS[date.getMonth()]!;
  const year = date.getFullYear();
  const weekdayIdx = (date.getDay() + 6) % 7;
  const weekday = AZ_WEEKDAYS_FULL[weekdayIdx]!;
  return `${day} ${month} ${year}, ${weekday}`;
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
      <circle cx="7" cy="7" r="6" stroke="#c9a460" strokeWidth="1.3" />
      <path d="M7 6.5v3.5M7 4.5v.5" stroke="#c9a460" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/* ── Component ───────────────────────────────────────────── */
export default function DatetimeStep() {
  const { salon, draft, draftLoaded, setStartAt } = useBookingContext();
  const router = useRouter();

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error'>('idle');
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
      if (!res.ok) throw new Error('Mövcudluq yüklənə bilmədi.');
      const data = (await res.json()) as AvailabilityResponse;
      setSlots(data.slots);
      setLoadState('idle');
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return;
      setErrorMsg('Vaxt slotları yüklənə bilmədi. Yenidən cəhd edin.');
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

  /* Calendar grid */
  const grid = buildCalendarGrid(calYear, calMonth);
  const monthLabel = `${AZ_MONTHS[calMonth]} ${calYear}`;

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

  return (
    <BookingPageShell
      title="Tarix və saat seçin"
      backHref={`/salons/${salon.slug}/book/stylist`}
      backLabel="Usta seçiminə qayıt"
      footer={
        <BookingCTAButton
          label="Davam et"
          disabled={!draft.startAt}
        />
      }
    >
      {/* Summary card (stylist + service) */}
      <div
        style={{
          background: 'white',
          border: '1px solid #ede5dc',
          borderRadius: 14,
          padding: '0.875rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          boxShadow: '0 1px 4px rgba(26,18,8,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: '#f5ece4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontWeight: 700, color: '#9c5f49', fontSize: '1rem',
          }}>
            {(selectedEmployee?.fullName ?? 'A').slice(0, 1).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1a1208', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedEmployee?.fullName ?? 'İstənilən usta'}
            </p>
            <p style={{ fontSize: '0.72rem', color: '#9a8878', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedService?.name ?? 'Xidmət'} · {selectedService
                ? new Intl.NumberFormat('az-AZ', { style: 'currency', currency: selectedService.currency }).format(selectedService.priceAmount / 100)
                : ''}
            </p>
          </div>
        </div>
        <a
          href={`/salons/${salon.slug}/book/service`}
          style={{
            flexShrink: 0,
            padding: '0.3rem 0.75rem',
            borderRadius: 8,
            border: '1px solid #ede5dc',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#c9a460',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Edit
        </a>
      </div>

      {/* Calendar section */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1208', marginBottom: '0.875rem' }}>
        Tarix seçin
      </h2>

      <div
        style={{
          background: 'white',
          border: '1px solid #ede5dc',
          borderRadius: 16,
          padding: '1rem',
          marginBottom: '1.25rem',
          boxShadow: '0 1px 4px rgba(26,18,8,0.05)',
        }}
      >
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={goPrevMonth}
            disabled={prevMonthDisabled}
            aria-label="Əvvəlki ay"
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #ede5dc',
              background: prevMonthDisabled ? '#faf5f0' : 'white',
              color: prevMonthDisabled ? '#c5bbb2' : '#1a1208',
              cursor: prevMonthDisabled ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronIcon dir="left" />
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1208' }}>{monthLabel}</span>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label="Növbəti ay"
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #ede5dc',
              background: 'white', color: '#1a1208', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronIcon dir="right" />
          </button>
        </div>

        {/* Weekday headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '0.5rem' }}>
          {AZ_WEEKDAYS.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 600, color: '#9a8878', padding: '0.25rem 0' }}>{d}</div>
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

              return (
                <button
                  key={ci}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleDateSelect(day)}
                  aria-label={formatAzDate(day)}
                  aria-pressed={isSelected}
                  style={{
                    height: 36, borderRadius: '50%', border: 'none',
                    background: isSelected ? '#c9a460' : isToday ? '#f5ece4' : 'transparent',
                    color: isSelected ? 'white' : isDisabled ? '#d5ccc5' : isToday ? '#c9a460' : '#1a1208',
                    fontWeight: isSelected || isToday ? 700 : 400,
                    fontSize: '0.82rem',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        ))}

        {/* Selected date label */}
        {selectedDate && selectedDateObj && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid #ede5dc', color: '#6b5e4a', fontSize: '0.78rem' }}>
            <CalendarIcon />
            <span>Seçilmiş tarix: <strong style={{ color: '#1a1208' }}>{formatAzDate(selectedDateObj)}</strong></span>
          </div>
        )}
      </div>

      {/* Time slots section */}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1208', marginBottom: '0.875rem' }}>
        Saat seçin
      </h2>

      {!selectedDate && (
        <p style={{ color: '#9a8878', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
          Saatları görmək üçün yuxarıdan tarix seçin.
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
          <p style={{ fontSize: '0.82rem', color: '#6b5e4a' }}>{errorMsg}</p>
          <button type="button" onClick={() => void fetchSlots(selectedDate)} style={{ fontSize: '0.78rem', fontWeight: 600, color: '#c9a460', background: 'none', border: 'none', cursor: 'pointer' }}>
            Yenidən cəhd et
          </button>
        </div>
      )}

      {selectedDate && loadState === 'idle' && slots.length === 0 && (
        <p style={{ color: '#9a8878', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
          Bu gün üçün mövcud vaxt yoxdur. Başqa tarix seçin.
        </p>
      )}

      {selectedDate && loadState === 'idle' && slots.length > 0 && (
        <>
          <div
            role="listbox"
            aria-label="Mövcud saatlar"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}
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
                    border: isSelected ? '2px solid #c9a460' : '1.5px solid #ede5dc',
                    background: isSelected ? '#c9a460' : 'white',
                    color: isSelected ? 'white' : '#1a1208',
                    fontSize: '0.88rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(201,164,96,0.3)' : '0 1px 2px rgba(26,18,8,0.04)',
                  }}
                >
                  {formatTime(slot.startAt, timezone)}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.875rem' }}>
            {[
              { dot: '#4caf50', label: 'Mövcuddur' },
              { dot: '#c9a460', label: 'Seçilmiş' },
              { dot: '#c5bbb2', label: 'Doludur' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#6b5e4a' }}>
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
          Seçilmiş saat 10 dəqiqəlik müddət üçün sizin üçün bloklanacaq.
        </p>
      </div>
    </BookingPageShell>
  );
}
