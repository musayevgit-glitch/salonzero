'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { apiFetch, ApiError } from '../../../../../lib/api-client';
import Link from 'next/link';
import { PageLayout } from '../../../../_components/PageLayout';

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

const BADGE_STYLE: Record<string, React.CSSProperties> = {
  PENDING: { background: '#fef3c7', color: '#92400e' },
  CONFIRMED: { background: '#dcfce7', color: '#166534' },
  CANCELLED_BY_CUSTOMER: { background: '#f3f4f6', color: '#4b5563' },
  CANCELLED_BY_SALON: { background: '#f3f4f6', color: '#4b5563' },
  REJECTED: { background: '#fee2e2', color: '#b91c1c' },
  CHECKED_IN: { background: '#dbeafe', color: '#1e40af' },
  COMPLETED: { background: '#f3e8ff', color: '#6b21a8' },
  NO_SHOW: { background: '#f3f4f6', color: '#4b5563' },
};

import { formatMoney } from '../../../../../lib/format-money';
import { formatLongDate, formatTime as formatTimeLocale } from '../../../../../lib/format-date';

/** Locale-aware — ICU may not carry `az`, which rendered dates as e.g. "M08 13, Thu". */
function formatReservationDate(iso: string, timezone: string, locale: string) {
  return formatLongDate(iso, locale, timezone);
}

function formatReservationTime(iso: string, timezone: string, locale: string) {
  return formatTimeLocale(iso, locale, timezone);
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

const API_URL =
  typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');

export default function ReservationDetailPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const router = useRouter();
  const t = useTranslations('account');
  const tb = useTranslations('booking');
  const tc = useTranslations('common');
  const locale = useLocale();

  const STATUS_MAP: Record<string, string> = {
    PENDING: t('statusPending'),
    CONFIRMED: t('statusConfirmed'),
    CANCELLED_BY_CUSTOMER: t('statusCancelledByCustomer'),
    CANCELLED_BY_SALON: t('statusCancelledBySalon'),
    CHECKED_IN: t('statusCheckedIn'),
    COMPLETED: t('statusCompleted'),
    NO_SHOW: t('statusNoShow'),
  };

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
          setError(tc('error'));
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
          setSlotsError(tc('error'));
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
      setCancelError(err instanceof Error ? err.message : tc('error'));
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
      setRescheduleError(err instanceof Error ? err.message : tc('error'));
      setRescheduling(false);
    }
  }

  if (loading) {
    return (
      <PageLayout activeNav="reservations" isAuthenticated={true}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxWidth: 600,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              height: 40,
              width: 250,
              background: '#e4d4f4',
              borderRadius: 8,
              animation: 'pulse 1.5s infinite',
            }}
          />
          <div
            style={{
              height: 300,
              width: '100%',
              background: '#e4d4f4',
              borderRadius: 16,
              animation: 'pulse 1.5s infinite',
            }}
          />
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }`}</style>
      </PageLayout>
    );
  }

  if (error || !reservation) {
    return (
      <PageLayout activeNav="reservations" isAuthenticated={true}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error ?? tc('error')}</p>
          <Link href="/account/reservations" style={{ color: '#7c3aed', textDecoration: 'none' }}>
            {t('backToReservations')}
          </Link>
        </div>
      </PageLayout>
    );
  }

  const dates = reservation.canReschedule
    ? buildDates(reservation.salon.timezone, reservation.salon.bookingPolicy ? 90 : 30)
    : [];

  const shortId = reservation.id.slice(-6).toUpperCase();
  const statusBadgeStyle = BADGE_STYLE[reservation.status] || {
    background: '#f3f4f6',
    color: '#4b5563',
  };

  return (
    <PageLayout activeNav="reservations" isAuthenticated={true}>
      <style>{`
        .sz-back-btn:hover { background: #faf5ff; border-color: #c4b5fd; color: #5b21b6; }
        .sz-back-btn:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
      `}</style>
      <div
        style={{
          maxWidth: 600,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        <div>
          <Link
            href="/account/reservations"
            className="sz-back-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              height: 40,
              padding: '0 1rem',
              marginBottom: '1rem',
              borderRadius: 10,
              border: '1.5px solid #e4d4f4',
              background: 'white',
              color: '#4a3f6b',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M11.5 14L6 9l5.5-5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t('backToList')}
          </Link>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '2rem',
              color: '#1e1b2e',
              margin: 0,
            }}
          >
            {t('reservationTitle')} #{shortId}
          </h1>
          <div style={{ marginTop: '0.75rem' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '0.35rem 1rem',
                borderRadius: 9999,
                fontSize: '0.85rem',
                fontWeight: 600,
                ...statusBadgeStyle,
              }}
            >
              {STATUS_MAP[reservation.status] || reservation.status}
            </span>
          </div>
        </div>

        <div
          style={{
            background: 'white',
            border: '1px solid #e4d4f4',
            borderRadius: 16,
            padding: '0 1.25rem',
          }}
        >
          <div
            style={{
              padding: '1rem 0',
              borderBottom: '1px solid #e4d4f4',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: '#7c6fa0' }}>{tb('salon')}</span>
            <span style={{ color: '#1e1b2e', fontWeight: 500 }}>{reservation.salon.name}</span>
          </div>
          <div
            style={{
              padding: '1rem 0',
              borderBottom: '1px solid #e4d4f4',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: '#7c6fa0' }}>{tb('serviceName')}</span>
            <span style={{ color: '#1e1b2e', fontWeight: 500 }}>{reservation.service.name}</span>
          </div>
          <div
            style={{
              padding: '1rem 0',
              borderBottom: '1px solid #e4d4f4',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: '#7c6fa0' }}>{tb('stylist')}</span>
            <span style={{ color: '#1e1b2e', fontWeight: 500 }}>
              {reservation.employee?.fullName ?? 'İstənilən'}
            </span>
          </div>
          <div
            style={{
              padding: '1rem 0',
              borderBottom: '1px solid #e4d4f4',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: '#7c6fa0' }}>{tb('date')}</span>
            <span style={{ color: '#1e1b2e', fontWeight: 500, textAlign: 'right' }}>
              {formatReservationDate(reservation.startAt, reservation.salon.timezone, locale)}
            </span>
          </div>
          <div
            style={{
              padding: '1rem 0',
              borderBottom: '1px solid #e4d4f4',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: '#7c6fa0' }}>{tb('time')}</span>
            <span style={{ color: '#1e1b2e', fontWeight: 500 }}>
              {formatReservationTime(reservation.startAt, reservation.salon.timezone, locale)}
            </span>
          </div>
          <div
            style={{
              padding: '1rem 0',
              borderBottom: '1px solid #e4d4f4',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: '#7c6fa0' }}>{tb('duration')}</span>
            <span style={{ color: '#1e1b2e', fontWeight: 500 }}>
              {reservation.service.durationMinutes} dəq
            </span>
          </div>
          <div style={{ padding: '1rem 0', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#7c6fa0' }}>{tb('price')}</span>
            <span style={{ color: '#1e1b2e', fontWeight: 600 }}>
              {formatMoney(reservation.priceAmount)}
            </span>
          </div>
          {reservation.customerNote && (
            <div
              style={{
                padding: '1rem 0',
                borderTop: '1px solid #e4d4f4',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <span style={{ color: '#7c6fa0' }}>{tb('note')}</span>
              <span style={{ color: '#1e1b2e', fontWeight: 500 }}>{reservation.customerNote}</span>
            </div>
          )}
        </div>

        {/* Reschedule */}
        {reservation.canReschedule && (
          <div style={{ marginTop: '0.5rem' }}>
            {!showReschedule ? (
              <button
                type="button"
                onClick={() => setShowReschedule(true)}
                style={{
                  background: '#1e1b2e',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                {t('reschedule')}
              </button>
            ) : (
              <div
                style={{
                  background: 'white',
                  border: '1px solid #e4d4f4',
                  borderRadius: 16,
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <p style={{ margin: 0, fontWeight: 600, color: '#1e1b2e' }}>{t('selectNewTime')}</p>

                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    overflowX: 'auto',
                    paddingBottom: '0.5rem',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  {dates.map((d) => {
                    const ds = toLocalDate(d, reservation.salon.timezone);
                    const active = ds === rescheduleDate;
                    return (
                      <button
                        key={ds}
                        type="button"
                        onClick={() => setRescheduleDate(ds)}
                        style={{
                          flex: '0 0 auto',
                          minWidth: '3.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          borderRadius: 8,
                          padding: '0.5rem 0.25rem',
                          border: active ? '1px solid #7c3aed' : '1px solid #e4d4f4',
                          background: active ? '#7c3aed' : 'white',
                          color: active ? 'white' : '#1e1b2e',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                          {new Intl.DateTimeFormat(locale, {
                            day: 'numeric',
                            timeZone: reservation.salon.timezone,
                          }).format(d)}
                        </span>
                        <span style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                          {new Intl.DateTimeFormat(locale, {
                            weekday: 'short',
                            timeZone: reservation.salon.timezone,
                          }).format(d)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!rescheduleDate && (
                  <p style={{ color: '#7c6fa0', fontSize: '0.9rem', margin: 0 }}>
                    {t('selectDayFirst')}
                  </p>
                )}

                {rescheduleDate && slotsLoading && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '0.5rem',
                    }}
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          height: 40,
                          background: '#e4d4f4',
                          borderRadius: 8,
                          animation: 'pulse 1.5s infinite',
                        }}
                      />
                    ))}
                  </div>
                )}

                {rescheduleDate && !slotsLoading && slotsError && (
                  <p style={{ color: '#dc2626', fontSize: '0.9rem', margin: 0 }}>{slotsError}</p>
                )}

                {rescheduleDate && !slotsLoading && !slotsError && slots.length === 0 && (
                  <p style={{ color: '#7c6fa0', fontSize: '0.9rem', margin: 0 }}>
                    {t('noSlotsForDay')}
                  </p>
                )}

                {rescheduleDate && !slotsLoading && slots.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '0.5rem',
                    }}
                  >
                    {slots.map((slot) => (
                      <button
                        key={slot.startAt}
                        type="button"
                        disabled={rescheduling}
                        onClick={() => handleReschedule(slot.startAt)}
                        style={{
                          background: 'white',
                          border: '1px solid #e4d4f4',
                          borderRadius: 8,
                          padding: '0.5rem',
                          color: '#1e1b2e',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          cursor: rescheduling ? 'not-allowed' : 'pointer',
                          opacity: rescheduling ? 0.6 : 1,
                        }}
                      >
                        {formatReservationTime(slot.startAt, reservation.salon.timezone, locale)}
                      </button>
                    ))}
                  </div>
                )}

                {rescheduleError && (
                  <p style={{ color: '#dc2626', fontSize: '0.9rem', margin: 0 }}>
                    {rescheduleError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setShowReschedule(false)}
                  style={{
                    alignSelf: 'flex-start',
                    background: 'none',
                    border: 'none',
                    color: '#7c6fa0',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {tc('cancel')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Cancel */}
        {reservation.canCancel && (
          <div style={{ marginTop: showReschedule ? 0 : '0.5rem' }}>
            {!showCancelConfirm ? (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                style={{
                  background: 'white',
                  color: '#dc2626',
                  border: '1px solid #dc2626',
                  borderRadius: 8,
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                {t('cancelReservation')}
              </button>
            ) : (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #f87171',
                  borderRadius: 16,
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <p style={{ margin: 0, fontWeight: 600, color: '#991b1b' }}>{t('cancelConfirm')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label htmlFor="cancel-reason" style={{ fontSize: '0.8rem', color: '#991b1b' }}>
                    {t('cancelReason')}
                  </label>
                  <input
                    id="cancel-reason"
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    maxLength={500}
                    placeholder={t('cancelReasonPlaceholder')}
                    style={{
                      padding: '0.6rem',
                      borderRadius: 8,
                      border: '1px solid #fca5a5',
                      outline: 'none',
                    }}
                  />
                </div>
                {cancelError && (
                  <p style={{ color: '#dc2626', fontSize: '0.9rem', margin: 0 }}>{cancelError}</p>
                )}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    style={{
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '0.6rem 1rem',
                      fontWeight: 500,
                      cursor: cancelling ? 'not-allowed' : 'pointer',
                      opacity: cancelling ? 0.7 : 1,
                    }}
                  >
                    {cancelling ? t('cancelling') : t('confirmCancelBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#991b1b',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                  >
                    {t('saveBtn')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        ::-webkit-scrollbar { display: none; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>
    </PageLayout>
  );
}
