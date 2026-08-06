'use client';

import { PublicShell } from '@salonomia/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useBookingContext } from '../_components/BookingContext';
import { BookingStepper } from '../_components/BookingStepper';

export default function StylistStep() {
  const { salon, draft, draftLoaded, setStylist } = useBookingContext();
  const router = useRouter();

  // Guard: wait for sessionStorage to load, then redirect if no service selected
  useEffect(() => {
    if (draftLoaded && !draft.serviceId) {
      router.replace(`/salons/${salon.slug}/book/service`);
    }
  }, [draftLoaded, draft.serviceId, router, salon.slug]);

  // Show nothing while draft loads or while redirecting
  if (!draftLoaded || !draft.serviceId) return null;

  const selectedService = [
    ...salon.serviceCategories.flatMap((c) => c.services),
    ...salon.uncategorizedServices,
  ].find((s) => s.id === draft.serviceId);

  function handleSelect(employeeId: string | null) {
    setStylist(employeeId);
    router.push(`/salons/${salon.slug}/book/datetime`);
  }

  // null means "no preference" was explicitly chosen; undefined means step not yet visited
  const noPreferenceSelected = 'employeeId' in draft && draft.employeeId === null;

  return (
    <PublicShell>
      <div className="mx-auto max-w-xl">
        <a
          href={`/salons/${salon.slug}/book/service`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          ← Back to service
        </a>

        <div className="mt-4">
          <BookingStepper />
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-text-primary">Choose a stylist</h1>

        {selectedService && (
          <p className="mt-1 text-sm text-text-secondary">
            For:{' '}
            <span className="font-medium text-text-primary">{selectedService.name}</span>
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleSelect(null)}
            aria-pressed={noPreferenceSelected}
            className={`w-full rounded-[var(--radius-sm)] border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              noPreferenceSelected
                ? 'border-accent bg-accent/5'
                : 'border-border bg-surface-raised hover:border-accent/50'
            }`}
          >
            <p className="font-medium text-text-primary">No preference</p>
            <p className="mt-0.5 text-sm text-text-secondary">
              Any available stylist will be assigned to your appointment
            </p>
          </button>

          {salon.employees.map((employee) => (
            <button
              key={employee.id}
              type="button"
              onClick={() => handleSelect(employee.id)}
              aria-pressed={draft.employeeId === employee.id}
              className={`w-full rounded-[var(--radius-sm)] border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                draft.employeeId === employee.id
                  ? 'border-accent bg-accent/5'
                  : 'border-border bg-surface-raised hover:border-accent/50'
              }`}
            >
              <p className="font-medium text-text-primary">{employee.fullName}</p>
              {employee.bio && (
                <p className="mt-0.5 text-sm text-text-secondary">{employee.bio}</p>
              )}
            </button>
          ))}

          {salon.employees.length === 0 && (
            <p className="mt-2 text-sm text-text-secondary">
              No stylists are listed yet.{' '}
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="text-accent underline"
              >
                Continue without preference
              </button>
            </p>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
