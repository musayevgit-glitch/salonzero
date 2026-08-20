'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { apiFetch } from '../../../../../../lib/api-client';
import { useBookingContext } from '../_components/BookingContext';
import { BookingCTAButton, BookingPageShell } from '../_components/BookingPageShell';

import { formatMoney } from '../../../../../../lib/format-money';

function formatDateLocale(iso: string, timezone: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatTimeLocale(iso: string, timezone: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    hour12: false,
  }).format(new Date(iso));
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2L3 4.5v4.5c0 2.76 2.24 4.5 5 5 2.76-.5 5-2.24 5-5V4.5L8 2z"
        stroke="#7c3aed"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M6 8l1.5 1.5L11 7"
        stroke="#7c3aed"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6" stroke="#6b5d8a" strokeWidth="1.3" />
      <path d="M7 6.5v3.5M7 4.5v.5" stroke="#6b5d8a" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
        padding: '0.75rem 0',
        borderBottom: '1px solid #f3e8ff',
      }}
    >
      <span style={{ fontSize: '0.85rem', color: '#7c6fa0', flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontSize: '0.85rem',
          color: '#1e1b2e',
          fontWeight: bold ? 700 : 500,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function SummaryStep() {
  const { salon, draft, draftLoaded } = useBookingContext();
  const router = useRouter();
  const t = useTranslations('booking');
  const tAuth = useTranslations('auth');
  const locale = useLocale();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (!draftLoaded) return;
    if (!draft.serviceId) {
      router.replace(`/salons/${salon.slug}/book/service`);
    } else if (!draft.startAt) {
      router.replace(`/salons/${salon.slug}/book/datetime`);
    }
  }, [draftLoaded, draft.serviceId, draft.startAt, router, salon.slug]);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    apiFetch('/auth/me')
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setAuthChecked(true));
  }, []);

  if (!draftLoaded || !draft.serviceId || !draft.startAt) return null;

  const selectedService = [
    ...salon.serviceCategories.flatMap((c) => c.services),
    ...salon.uncategorizedServices,
  ].find((s) => s.id === draft.serviceId);

  const selectedEmployee =
    draft.employeeId != null ? salon.employees.find((e) => e.id === draft.employeeId) : null;

  const confirmHref = `/salons/${salon.slug}/book/confirm`;
  const loginHref = `/login?returnTo=${encodeURIComponent(confirmHref)}`;

  function handleContinue() {
    router.push(isAuthenticated ? confirmHref : loginHref);
  }

  return (
    <BookingPageShell
      title={t('summary')}
      backHref={`/salons/${salon.slug}/book/datetime`}
      backLabel={t('backToDateTime')}
      footer={
        <>
          {authChecked ? (
            <BookingCTAButton
              label={isAuthenticated ? t('createReservation') : tAuth('loginBtn')}
              onClick={handleContinue}
            />
          ) : (
            <div
              style={{
                height: 52,
                borderRadius: 14,
                background: '#f0e8e0',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          )}
          {authChecked && !isAuthenticated && (
            <p
              style={{
                textAlign: 'center',
                fontSize: '0.72rem',
                color: '#7c6fa0',
                marginTop: '0.6rem',
              }}
            >
              {tAuth('noAccount')}{' '}
              <a
                href={`/register?returnTo=${encodeURIComponent(confirmHref)}`}
                style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}
              >
                {tAuth('register')}
              </a>
            </p>
          )}
        </>
      }
    >
      {/* Summary card */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e4d4f4',
          borderRadius: 16,
          padding: '1.25rem',
          marginBottom: '1rem',
          boxShadow: '0 2px 8px rgba(30,27,46,0.06)',
        }}
      >
        <h2
          style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#1e1b2e',
            marginBottom: '0.25rem',
          }}
        >
          {t('bookingDetails')}
        </h2>

        <div style={{ borderTop: '1px solid #f3e8ff', marginTop: '0.75rem' }}>
          <Row label={t('salon')} value={salon.name} />
          <Row label={t('stylist')} value={selectedEmployee?.fullName ?? t('anyStylist')} />
          {selectedService && <Row label={t('serviceName')} value={selectedService.name} />}
          {selectedService && (
            <Row label={t('price')} value={formatMoney(selectedService.priceAmount)} />
          )}
          <Row label={t('date')} value={formatDateLocale(draft.startAt, salon.timezone, locale)} />
          <Row label={t('time')} value={formatTimeLocale(draft.startAt, salon.timezone, locale)} />
          {selectedService && (
            <Row label={t('duration')} value={`${selectedService.durationMinutes} ${t('min')}`} />
          )}
        </div>
      </div>

      {/* Rules card */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e4d4f4',
          borderRadius: 16,
          padding: '1rem 1.25rem',
          marginBottom: '1rem',
          boxShadow: '0 1px 4px rgba(30,27,46,0.04)',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}
        >
          <ShieldIcon />
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e1b2e' }}>
            Rezervasiya qaydaları
          </h3>
        </div>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
          }}
        >
          {[
            'Rezervasiya təsdiqi salon admini tərəfindən ediləcək.',
            'Gözləmədə statusu ilə yaradılır.',
            '24 saat qalmış ləğv edilərsə qeyd edilə bilər.',
            'Gecikməsi halında rezervasiya ləğv oluna bilər.',
          ].map((rule) => (
            <li
              key={rule}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.4rem',
                fontSize: '0.78rem',
                color: '#6b5d8a',
                lineHeight: 1.5,
              }}
            >
              <span style={{ marginTop: '0.2rem', flexShrink: 0, color: '#7c3aed' }}>•</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Total */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e4d4f4',
          borderRadius: 16,
          padding: '1rem 1.25rem',
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(30,27,46,0.04)',
        }}
      >
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e1b2e' }}>Ümumi məbləğ</span>
        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e1b2e' }}>
          {selectedService ? formatMoney(selectedService.priceAmount) : '—'}
        </span>
      </div>

      {/* Payment note */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0 0.25rem',
          marginBottom: '0.5rem',
        }}
      >
        <InfoIcon />
        <p style={{ fontSize: '0.75rem', color: '#7c6fa0' }}>{t('paymentNote')}</p>
      </div>
    </BookingPageShell>
  );
}
