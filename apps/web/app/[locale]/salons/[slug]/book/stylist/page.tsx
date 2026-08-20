'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useBookingContext } from '../_components/BookingContext';
import { BookingPageShell } from '../_components/BookingPageShell';
import { getInitials } from '../../../../../../lib/initials';

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StylistStep() {
  const { salon, draft, draftLoaded, setStylist } = useBookingContext();
  const router = useRouter();
  const t = useTranslations('booking');

  useEffect(() => {
    if (draftLoaded && !draft.serviceId) {
      router.replace(`/salons/${salon.slug}/book/service`);
    }
  }, [draftLoaded, draft.serviceId, router, salon.slug]);

  if (!draftLoaded || !draft.serviceId) return null;

  const selectedService = [
    ...salon.serviceCategories.flatMap((c) => c.services),
    ...salon.uncategorizedServices,
  ].find((s) => s.id === draft.serviceId);

  function handleSelect(employeeId: string | null) {
    setStylist(employeeId);
    router.push(`/salons/${salon.slug}/book/datetime`);
  }

  const noPreferenceSelected = 'employeeId' in draft && draft.employeeId === null;

  return (
    <BookingPageShell
      step={2}
      title={t('selectStylist')}
      backHref={`/salons/${salon.slug}/book/service`}
      backLabel={t('backToService')}
    >
      {/* Selected service badge */}
      {selectedService && (
        <div
          style={{
            background: 'white',
            border: '1px solid #e4d4f4',
            borderRadius: 12,
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.82rem',
          }}
        >
          <span style={{ color: '#6b5d8a' }}>{t('serviceName')}</span>
          <span style={{ fontWeight: 700, color: '#1e1b2e' }}>{selectedService.name}</span>
        </div>
      )}

      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b2e', marginBottom: '0.75rem' }}>
        {t('stylist')}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {/* No preference option */}
        <button
          type="button"
          onClick={() => handleSelect(null)}
          aria-pressed={noPreferenceSelected}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '0.875rem 1rem',
            borderRadius: 14,
            border: noPreferenceSelected ? '2px solid #7c3aed' : '1.5px solid #e4d4f4',
            background: noPreferenceSelected ? '#fffbf5' : 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
            boxShadow: '0 1px 3px rgba(30,27,46,0.05)',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#f3e8ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '1.1rem',
            }}
          >
            ✦
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e1b2e' }}>
              {t('anyStylist')}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#7c6fa0', marginTop: '0.15rem' }}>
              {t('anyAvailable')}
            </p>
          </div>
          <span style={{ color: '#c5bbb2' }}>
            <ChevronRightIcon />
          </span>
        </button>

        {/* Employee list */}
        {salon.employees.map((employee, i) => {
          const selected = draft.employeeId === employee.id;

          return (
            <button
              key={employee.id}
              type="button"
              onClick={() => handleSelect(employee.id)}
              aria-pressed={selected}
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
                boxShadow: selected
                  ? '0 0 0 3px rgba(201,164,96,0.12)'
                  : '0 1px 3px rgba(30,27,46,0.05)',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: `hsl(${(i * 47 + 20) % 360}, 35%, 72%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'white',
                  overflow: 'hidden',
                }}
              >
                {getInitials(employee.fullName)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e1b2e' }}>
                  {employee.fullName}
                </p>
                {employee.bio && (
                  <p
                    style={{
                      fontSize: '0.72rem',
                      color: '#7c6fa0',
                      marginTop: '0.1rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {employee.bio}
                  </p>
                )}
              </div>

              <span style={{ color: '#c5bbb2' }}>
                <ChevronRightIcon />
              </span>
            </button>
          );
        })}

        {salon.employees.length === 0 && (
          <p
            style={{
              color: '#7c6fa0',
              fontSize: '0.875rem',
              textAlign: 'center',
              marginTop: '1rem',
            }}
          >
            {t('noStylistsAvailable')}{' '}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              style={{
                color: '#7c3aed',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'inherit',
              }}
            >
              {t('continueBtn')}
            </button>
          </p>
        )}
      </div>
    </BookingPageShell>
  );
}
