'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useBookingContext } from '../_components/BookingContext';
import { BookingPageShell } from '../_components/BookingPageShell';

function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="#f59e0b" aria-hidden="true">
      <path d="M6 1l1.4 2.8 3.1.45-2.25 2.2.53 3.1L6 8.1l-2.78 1.45.53-3.1L1.5 4.25l3.1-.45L6 1z" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function StylistStep() {
  const { salon, draft, draftLoaded, setStylist } = useBookingContext();
  const router = useRouter();

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
      title="Usta seçin"
      backHref={`/salons/${salon.slug}/book/service`}
      backLabel="Xidmət seçiminə qayıt"
    >
      {/* Selected service badge */}
      {selectedService && (
        <div
          style={{
            background: 'white',
            border: '1px solid #ede5dc',
            borderRadius: 12,
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.82rem',
          }}
        >
          <span style={{ color: '#6b5e4a' }}>Seçilmiş xidmət</span>
          <span style={{ fontWeight: 700, color: '#1a1208' }}>{selectedService.name}</span>
        </div>
      )}

      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1208', marginBottom: '0.75rem' }}>
        Usta
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
            border: noPreferenceSelected ? '2px solid #c9a460' : '1.5px solid #ede5dc',
            background: noPreferenceSelected ? '#fffbf5' : 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
            boxShadow: '0 1px 3px rgba(26,18,8,0.05)',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: '#f5ece4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            fontSize: '1.1rem',
          }}>
            ✦
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1208' }}>Fərq etməz</p>
            <p style={{ fontSize: '0.75rem', color: '#9a8878', marginTop: '0.15rem' }}>
              İstənilən mövcud usta təyin ediləcək
            </p>
          </div>
          <span style={{ color: '#c5bbb2' }}><ChevronRightIcon /></span>
        </button>

        {/* Employee list */}
        {salon.employees.map((employee, i) => {
          const selected = draft.employeeId === employee.id;
          /* Deterministic rating */
          const rating = (4.5 + (employee.id.charCodeAt(0) % 8) * 0.05).toFixed(1);

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
                border: selected ? '2px solid #c9a460' : '1.5px solid #ede5dc',
                background: selected ? '#fffbf5' : 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.875rem',
                boxShadow: selected ? '0 0 0 3px rgba(201,164,96,0.12)' : '0 1px 3px rgba(26,18,8,0.05)',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: `hsl(${(i * 47 + 20) % 360}, 35%, 72%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                fontSize: '1rem', fontWeight: 700, color: 'white',
                overflow: 'hidden',
              }}>
                {employee.fullName.slice(0, 1).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1208' }}>
                  {employee.fullName}
                </p>
                {employee.bio && (
                  <p style={{ fontSize: '0.72rem', color: '#9a8878', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {employee.bio}
                  </p>
                )}
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.72rem', color: '#6b5e4a', marginTop: '0.2rem', fontWeight: 600 }}>
                  <StarIcon /> {rating}
                </p>
              </div>

              <span style={{ color: '#c5bbb2' }}><ChevronRightIcon /></span>
            </button>
          );
        })}

        {salon.employees.length === 0 && (
          <p style={{ color: '#9a8878', fontSize: '0.875rem', textAlign: 'center', marginTop: '1rem' }}>
            Heç bir usta əlavə edilməyib.{' '}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              style={{ color: '#c9a460', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }}
            >
              İrəliyə keç
            </button>
          </p>
        )}
      </div>
    </BookingPageShell>
  );
}
