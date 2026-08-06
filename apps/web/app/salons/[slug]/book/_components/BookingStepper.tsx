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
    <nav aria-label="Booking steps" className="overflow-x-auto py-1">
      <ol className="flex min-w-max items-center gap-1">
        {STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={step.segment} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden className="h-px w-5 shrink-0 bg-border" />}
              <span className={`flex flex-col items-center gap-0.5 ${!done && !active ? 'opacity-40' : ''}`}>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
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
                  className={`whitespace-nowrap text-xs ${active ? 'font-medium text-text-primary' : 'text-text-secondary'}`}
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
