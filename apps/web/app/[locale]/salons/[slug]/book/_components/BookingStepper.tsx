'use client';

import { usePathname } from 'next/navigation';

/* 3-step visual stepper matching the design */
const VISUAL_STEPS = [
  { label: 'Xidmət', segments: ['service', 'stylist'] },
  { label: 'Tarix və saat', segments: ['datetime'] },
  { label: 'Təsdiq', segments: ['summary', 'confirm'] },
];

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path
        d="M2.5 6.5l3 3 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookingStepper() {
  const pathname = usePathname();
  const segment = pathname.split('/').pop() ?? '';

  const currentStep = VISUAL_STEPS.findIndex((s) => s.segments.includes(segment));

  return (
    <nav aria-label="Rezervasiya addımları" style={{ width: '100%', padding: '0.5rem 0 1rem' }}>
      <ol
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          position: 'relative',
        }}
      >
        {VISUAL_STEPS.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;

          return (
            <li
              key={step.label}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
            >
              {/* Connector line */}
              {i > 0 && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '-50%',
                    top: '14px',
                    width: '100%',
                    height: '2px',
                    background: done || active ? '#c9a460' : '#e5ddd5',
                    transition: 'background 0.3s ease',
                  }}
                />
              )}

              {/* Bubble */}
              <span
                aria-current={active ? 'step' : undefined}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: done
                    ? '#c9a460'
                    : active
                      ? '#1a1208'
                      : 'transparent',
                  border: done
                    ? '2px solid #c9a460'
                    : active
                      ? '2px solid #1a1208'
                      : '2px solid #c5bbb2',
                  color: done || active ? '#fff' : '#9a8878',
                  transition: 'all 0.2s ease',
                }}
              >
                {done ? <CheckIcon /> : i + 1}
              </span>

              {/* Label */}
              <span
                style={{
                  marginTop: '0.35rem',
                  fontSize: '0.65rem',
                  fontWeight: active ? 600 : 400,
                  color: active ? '#1a1208' : done ? '#c9a460' : '#9a8878',
                  textAlign: 'center',
                  transition: 'color 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
