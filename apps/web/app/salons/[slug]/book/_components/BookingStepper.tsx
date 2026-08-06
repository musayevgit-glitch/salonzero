'use client';

import { usePathname } from 'next/navigation';

const STEPS = [
  { label: 'Service', segment: 'service' },
  { label: 'Stylist', segment: 'stylist' },
  { label: 'Date & time', segment: 'datetime' },
  { label: 'Summary', segment: 'summary' },
  { label: 'Confirm', segment: 'confirm' },
];

export function BookingStepper() {
  const pathname = usePathname();
  const currentIndex = STEPS.findIndex((s) => pathname.endsWith(`/book/${s.segment}`));

  return (
    <nav aria-label="Booking steps" className="py-1">
      <ol className="grid grid-cols-5 items-start gap-1">
        {STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={step.segment} className="relative flex min-w-0 justify-center">
              {i > 0 && (
                <span aria-hidden className="absolute left-[-50%] top-3 h-px w-full bg-border" />
              )}
              <span
                className={`flex flex-col items-center gap-0.5 ${!done && !active ? 'opacity-40' : ''}`}
              >
                <span
                  className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? 'bg-accent text-white'
                      : done
                        ? 'bg-accent/20 text-accent'
                        : 'bg-border text-text-secondary'
                  }`}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span
                  className={`max-w-16 text-center text-[11px] leading-tight sm:max-w-none sm:text-xs ${active ? 'font-medium text-text-primary' : 'text-text-secondary'}`}
                >
                  {step.label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
