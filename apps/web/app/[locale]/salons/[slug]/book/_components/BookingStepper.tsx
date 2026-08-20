'use client';

import { usePathname } from 'next/navigation';

/**
 * 4-step visual stepper: Xidmət → Stilist → Tarix → Təsdiq.
 *
 * Pages pass an explicit 1-based `step`; the pathname mapping stays as a fallback so a page that
 * forgets the prop still highlights the right bubble instead of showing none.
 */
const VISUAL_STEPS = [
  { label: 'Xidmət', segments: ['service'] },
  { label: 'Stilist', segments: ['stylist'] },
  { label: 'Tarix', segments: ['datetime'] },
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

export function BookingStepper({ step }: { step?: number }) {
  const pathname = usePathname();
  const segment = pathname ? (pathname.split('/').pop() ?? '') : '';

  const currentStep =
    step && step >= 1 && step <= VISUAL_STEPS.length
      ? step - 1
      : VISUAL_STEPS.findIndex((s) => s.segments.includes(segment));

  return (
    <nav aria-label="Rezervasiya addımları" style={{ width: '100%', padding: '0.25rem 0 1.25rem' }}>
      <ol
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${VISUAL_STEPS.length}, 1fr)`,
          position: 'relative',
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {VISUAL_STEPS.map((s, i) => {
          const done = i < currentStep;
          const active = i === currentStep;

          return (
            <li
              key={s.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
              }}
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
                    background: done || active ? '#7c3aed' : '#e4d4f4',
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
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: done || active ? '#7c3aed' : '#ffffff',
                  border: done || active ? '2px solid #7c3aed' : '2px solid #e4d4f4',
                  color: done || active ? '#fff' : '#7c6fa0',
                  boxShadow: active ? '0 0 0 4px rgba(124,58,237,0.16)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {done ? <CheckIcon /> : i + 1}
              </span>

              {/* Label */}
              <span
                style={{
                  marginTop: '0.4rem',
                  fontSize: '0.7rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#5b21b6' : done ? '#7c3aed' : '#7c6fa0',
                  textAlign: 'center',
                  transition: 'color 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
