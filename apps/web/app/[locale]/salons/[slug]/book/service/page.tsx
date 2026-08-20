'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useBookingContext } from '../_components/BookingContext';
import { BookingCTAButton, BookingPageShell } from '../_components/BookingPageShell';
import { formatMoney } from '../../../../../../lib/format-money';
import { getInitials } from '../../../../../../lib/initials';

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6" stroke="#7c3aed" strokeWidth="1.3" />
      <path d="M7 6.5v3.5M7 4.5v.5" stroke="#7c3aed" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export default function ServiceStep() {
  const { salon, draft, setService } = useBookingContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('booking');
  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);

  // Stylist pre-selected from a stylist card ("?employee=<id>") on the stylist listing or the
  // salon detail page. It is only honoured when it matches a real employee of THIS salon, so a
  // tampered URL cannot smuggle another salon's employee id into the draft.
  const employeeParam = searchParams ? searchParams.get('employee') : null;
  const preselectedEmployee = employeeParam
    ? (salon.employees.find((e) => e.id === employeeParam) ?? null)
    : null;
  const preselectedEmployeeId = preselectedEmployee ? preselectedEmployee.id : null;

  const allServices = [
    ...salon.serviceCategories.flatMap((c) => c.services),
    ...salon.uncategorizedServices,
  ];

  const visibleServices =
    activeCategoryId === null
      ? allServices
      : activeCategoryId === '__uncategorized__'
        ? salon.uncategorizedServices
        : (salon.serviceCategories.find((c) => c.id === activeCategoryId)?.services ?? []);

  const selectedService = allServices.find((s) => s.id === draft.serviceId);

  function handleSelect(serviceId: string) {
    setService(serviceId, preselectedEmployeeId ?? undefined);
  }

  function handleContinue() {
    if (!draft.serviceId) return;
    if (preselectedEmployeeId) {
      // Stylist already chosen — skip stylist step, go straight to datetime
      router.push(`/salons/${salon.slug}/book/datetime`);
    } else {
      router.push(`/salons/${salon.slug}/book/stylist`);
    }
  }

  const hasServices = allServices.length > 0;

  return (
    <BookingPageShell
      title={t('selectService')}
      backHref={`/salons/${salon.slug}`}
      backLabel={t('backToSalon')}
      footer={
        <BookingCTAButton
          label={t('continueBtn')}
          onClick={handleContinue}
          disabled={!draft.serviceId}
        />
      }
    >
      {/* Salon card */}
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid #e4d4f4',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.875rem',
          padding: '0.875rem',
          boxShadow: '0 2px 8px rgba(30,27,46,0.06)',
        }}
      >
        {/* Salon photo */}
        <div style={{ width: 90, height: 90, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
          <img
            src="/images/salon-2.png"
            alt={salon.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{ fontWeight: 700, fontSize: '1rem', color: '#1e1b2e', marginBottom: '0.25rem' }}
          >
            {salon.name}
          </p>
          <a
            href={`/salons/${salon.slug}`}
            style={{
              display: 'inline-block',
              marginTop: '0.5rem',
              padding: '0.25rem 0.75rem',
              borderRadius: 8,
              border: '1px solid #e4d4f4',
              fontSize: '0.72rem',
              fontWeight: 500,
              color: '#6b5d8a',
              textDecoration: 'none',
            }}
          >
            {t('viewSalonProfile')}
          </a>
        </div>
      </div>

      {/* Pre-selected stylist — carried through the flow, the stylist step is skipped */}
      {preselectedEmployee ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: '#faf5ff',
            border: '1px solid #e4d4f4',
            borderRadius: 14,
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#7c3aed',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.85rem',
              flexShrink: 0,
            }}
          >
            {getInitials(preselectedEmployee.fullName)}
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: '0.72rem', color: '#6b5d8a' }}>
              {t('stylist')}
            </span>
            <span
              style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#1e1b2e' }}
            >
              {preselectedEmployee.fullName}
            </span>
          </span>
        </div>
      ) : null}

      {!hasServices && (
        <p
          style={{ color: '#7c6fa0', fontSize: '0.875rem', textAlign: 'center', marginTop: '2rem' }}
        >
          {t('noServicesAvailable')}
        </p>
      )}

      {/* Service header */}
      {hasServices && (
        <h2
          style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b2e', marginBottom: '0.75rem' }}
        >
          {t('serviceName')}
        </h2>
      )}

      {/* Category tabs */}
      {hasServices && salon.serviceCategories.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            overflowX: 'auto',
            marginBottom: '0.875rem',
            paddingBottom: '0.25rem',
            scrollbarWidth: 'none',
          }}
          role="tablist"
          aria-label="Kateqoriyalar"
        >
          {[
            { id: null, label: t('allCategories'), count: allServices.length },
            ...salon.serviceCategories.map((c) => ({
              id: c.id,
              label: c.name,
              count: c.services.length,
            })),
            ...(salon.uncategorizedServices.length > 0
              ? [
                  {
                    id: '__uncategorized__',
                    label: t('otherCategory'),
                    count: salon.uncategorizedServices.length,
                  },
                ]
              : []),
          ].map((tab) => {
            const active = activeCategoryId === tab.id;
            return (
              <button
                key={String(tab.id)}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveCategoryId(tab.id)}
                style={{
                  flexShrink: 0,
                  padding: '0.4rem 0.9rem',
                  borderRadius: 20,
                  border: active ? '1.5px solid #7c3aed' : '1.5px solid #e4d4f4',
                  background: active ? '#7c3aed' : 'white',
                  color: active ? 'white' : '#6b5d8a',
                  fontSize: '0.8rem',
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
                <span
                  style={{
                    marginLeft: '0.35rem',
                    fontSize: '0.7rem',
                    opacity: 0.75,
                  }}
                >
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Service list */}
      <ul
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
        role="listbox"
        aria-label="Xidmətlər"
      >
        {visibleServices.map((service) => {
          const selected = draft.serviceId === service.id;
          return (
            <li key={service.id}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => handleSelect(service.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.875rem 1rem',
                  borderRadius: 14,
                  border: selected ? '2px solid #7c3aed' : '1.5px solid #e4d4f4',
                  background: selected ? '#fffbf5' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  transition: 'border-color 0.15s, background 0.15s',
                  boxShadow: selected
                    ? '0 0 0 3px rgba(201,164,96,0.12)'
                    : '0 1px 3px rgba(30,27,46,0.05)',
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 10,
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: '#f3e8ff',
                  }}
                >
                  <img
                    src="/images/salon-1.png"
                    alt=""
                    aria-hidden="true"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e1b2e' }}>
                    {service.name}
                  </p>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#7c3aed',
                      marginTop: '0.15rem',
                    }}
                  >
                    {formatMoney(service.priceAmount)}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#7c6fa0', marginTop: '0.1rem' }}>
                    {service.durationMinutes} {t('min')}
                  </p>
                </div>

                {/* Radio */}
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: selected ? '6px solid #7c3aed' : '2px solid #c5bbb2',
                    flexShrink: 0,
                    transition: 'border 0.15s',
                  }}
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Info note */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem',
          marginTop: '1rem',
          padding: '0.75rem',
          borderRadius: 12,
          background: '#fffbf2',
          border: '1px solid #f0e4c0',
        }}
      >
        <span style={{ flexShrink: 0, marginTop: '0.05rem' }}>
          <InfoIcon />
        </span>
        <p style={{ fontSize: '0.75rem', color: '#8a7355', lineHeight: 1.5 }}>{t('priceNote')}</p>
      </div>
    </BookingPageShell>
  );
}
