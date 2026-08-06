'use client';

import { Button, PublicShell, Skeleton } from '@salonomia/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';
import { useBookingContext } from '../_components/BookingContext';
import { BookingStepper } from '../_components/BookingStepper';

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100);
}

function formatDateTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  }).format(new Date(iso));
}

export default function SummaryStep() {
  const { salon, draft, draftLoaded } = useBookingContext();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const checked = useRef(false);

  // Guard: need service + startAt
  useEffect(() => {
    if (!draftLoaded) return;
    if (!draft.serviceId) {
      router.replace(`/salons/${salon.slug}/book/service`);
    } else if (!draft.startAt) {
      router.replace(`/salons/${salon.slug}/book/datetime`);
    }
  }, [draftLoaded, draft.serviceId, draft.startAt, router, salon.slug]);

  // Check auth silently — no redirect here, just show the right CTA
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
    if (isAuthenticated) {
      router.push(confirmHref);
    } else {
      router.push(loginHref);
    }
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-xl">
        <a
          href={`/salons/${salon.slug}/book/datetime`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          ← Back to date &amp; time
        </a>

        <div className="mt-4">
          <BookingStepper />
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-text-primary">Review your booking</h1>

        <div className="mt-6 flex flex-col gap-3 rounded-[var(--radius-sm)] border border-border bg-surface-raised p-5">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Salon</dt>
              <dd className="text-right font-medium text-text-primary">{salon.name}</dd>
            </div>

            {selectedService && (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Service</dt>
                  <dd className="text-right font-medium text-text-primary">
                    {selectedService.name}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Duration</dt>
                  <dd className="text-right text-text-primary">
                    {selectedService.durationMinutes} min
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-secondary">Price</dt>
                  <dd className="text-right font-semibold text-text-primary">
                    {formatMoney(selectedService.priceAmount, selectedService.currency)}
                  </dd>
                </div>
              </>
            )}

            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Stylist</dt>
              <dd className="text-right text-text-primary">
                {selectedEmployee ? selectedEmployee.fullName : 'Any available stylist'}
              </dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-text-secondary">Date &amp; time</dt>
              <dd className="text-right text-text-primary">
                {formatDateTime(draft.startAt, salon.timezone)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {!authChecked ? (
            <Skeleton className="h-11 w-full" />
          ) : (
            <Button onClick={handleContinue} className="w-full">
              {isAuthenticated ? 'Continue to confirm' : 'Log in to confirm'}
            </Button>
          )}

          {!authChecked ? null : !isAuthenticated ? (
            <p className="text-center text-sm text-text-secondary">
              New here?{' '}
              <a
                href={`/register?returnTo=${encodeURIComponent(confirmHref)}`}
                className="text-accent underline"
              >
                Create an account
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </PublicShell>
  );
}
