'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBookingContext } from '../_components/BookingContext';
import { BookingCTAButton, BookingPageShell } from '../_components/BookingPageShell';
import { formatMoney } from '../../../../../lib/format-money';

function LocationPinIcon() {
  return (
    <svg width="11" height="13" viewBox="0 0 12 14" fill="none" aria-hidden="true">
      <path d="M6 1a4.5 4.5 0 0 1 4.5 4.5C10.5 9.5 6 13 6 13S1.5 9.5 1.5 5.5A4.5 4.5 0 0 1 6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="6" cy="5.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="#f59e0b" aria-hidden="true">
      <path d="M6 1l1.4 2.8 3.1.45-2.25 2.2.53 3.1L6 8.1l-2.78 1.45.53-3.1L1.5 4.25l3.1-.45L6 1z" />
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

export default function ServiceStep() {
  const { salon, draft, setService } = useBookingContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeCategoryId, setActiveCategoryId] = React.useState<string | null>(null);

  // Pre-selected employee from stylist card "Rezerv et" link
  const preselectedEmployeeId = searchParams.get('employee');

  const allServices = [
    ...salon.serviceCategories.flatMap((c) => c.services),
    ...salon.uncategorizedServices,
  ];

  const visibleServices = activeCategoryId === null
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
      title="Rezervasiya et"
      backHref={`/salons/${salon.slug}`}
      backLabel={`${salon.name} səhifəsinə qayıt`}
      footer={
        <BookingCTAButton
          label="Davam et"
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
          border: '1px solid #ede5dc',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.875rem',
          padding: '0.875rem',
          boxShadow: '0 2px 8px rgba(26,18,8,0.06)',
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
          <p style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1208', marginBottom: '0.25rem' }}>
            {salon.name}
          </p>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#9a8878', marginBottom: '0.4rem' }}>
            <span style={{ color: '#c9a460' }}><LocationPinIcon /></span>
            Bakı, Azərbaycan
          </p>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#1a1208', fontWeight: 600 }}>
            <StarIcon /> 4.9 (128)
          </p>
          <a
            href={`/salons/${salon.slug}`}
            style={{
              display: 'inline-block',
              marginTop: '0.5rem',
              padding: '0.25rem 0.75rem',
              borderRadius: 8,
              border: '1px solid #ede5dc',
              fontSize: '0.72rem',
              fontWeight: 500,
              color: '#6b5e4a',
              textDecoration: 'none',
            }}
          >
            Salon profilinə bax
          </a>
        </div>
      </div>

      {!hasServices && (
        <p style={{ color: '#9a8878', fontSize: '0.875rem', textAlign: 'center', marginTop: '2rem' }}>
          Hal-hazırda heç bir xidmət mövcud deyil.
        </p>
      )}

      {/* Xidmət header */}
      {hasServices && (
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1208', marginBottom: '0.75rem' }}>
          Xidmət
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
            { id: null, label: 'Hamısı', count: allServices.length },
            ...salon.serviceCategories.map((c) => ({ id: c.id, label: c.name, count: c.services.length })),
            ...(salon.uncategorizedServices.length > 0
              ? [{ id: '__uncategorized__', label: 'Digər', count: salon.uncategorizedServices.length }]
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
                  border: active ? '1.5px solid #5c3d28' : '1.5px solid #ede5dc',
                  background: active ? '#5c3d28' : 'white',
                  color: active ? 'white' : '#6b5e4a',
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
      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', listStyle: 'none', padding: 0, margin: 0 }} role="listbox" aria-label="Xidmətlər">
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
                  border: selected ? '2px solid #c9a460' : '1.5px solid #ede5dc',
                  background: selected ? '#fffbf5' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  transition: 'border-color 0.15s, background 0.15s',
                  boxShadow: selected ? '0 0 0 3px rgba(201,164,96,0.12)' : '0 1px 3px rgba(26,18,8,0.05)',
                }}
              >
                {/* Thumbnail */}
                <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#f5ece4' }}>
                  <img
                    src="/images/salon-1.png"
                    alt=""
                    aria-hidden="true"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1208' }}>{service.name}</p>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c9a460', marginTop: '0.15rem' }}>
                    {formatMoney(service.priceAmount)}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#9a8878', marginTop: '0.1rem' }}>
                    {service.durationMinutes} dəq
                  </p>
                </div>

                {/* Radio */}
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: selected ? '6px solid #c9a460' : '2px solid #c5bbb2',
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
        <span style={{ flexShrink: 0, marginTop: '0.05rem' }}><InfoIcon /></span>
        <p style={{ fontSize: '0.75rem', color: '#8a7355', lineHeight: 1.5 }}>
          Qiymətlər ustaya görə dəyişə bilər.
        </p>
      </div>
    </BookingPageShell>
  );
}
