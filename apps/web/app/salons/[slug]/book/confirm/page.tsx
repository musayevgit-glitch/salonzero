'use client';

import { Button, PublicShell } from '@salonomia/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';
import { useBookingContext } from '../_components/BookingContext';
import { BookingStepper } from '../_components/BookingStepper';

interface CustomerProfile {
  fullName: string | null;
  phone: string | null;
  email: string;
}

export default function ConfirmStep() {
  const { salon, draft, draftLoaded, clearDraft, setStartAt } = useBookingContext();
  const router = useRouter();

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [note, setNote] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileLoaded = useRef(false);

  // Guard: need a complete draft
  useEffect(() => {
    if (!draftLoaded) return;
    if (!draft.serviceId) {
      router.replace(`/salons/${salon.slug}/book/service`);
    } else if (!draft.startAt) {
      router.replace(`/salons/${salon.slug}/book/datetime`);
    }
  }, [draftLoaded, draft.serviceId, draft.startAt, router, salon.slug]);

  useEffect(() => {
    if (profileLoaded.current) return;
    profileLoaded.current = true;
    apiFetch<CustomerProfile>('/customer/profile')
      .then((p) => setProfile(p))
      .catch(() =>
        router.replace(
          `/login?returnTo=${encodeURIComponent(`/salons/${salon.slug}/book/confirm`)}`,
        ),
      );
  }, [router, salon.slug]);

  if (!draftLoaded || !draft.serviceId || !draft.startAt) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!termsAccepted) return;
    if (!draft.serviceId || !draft.startAt || !draft.idempotencyKey) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<{ id: string }>('/reservations', {
        method: 'POST',
        body: JSON.stringify({
          salonId: salon.id,
          serviceId: draft.serviceId,
          employeeId: draft.employeeId ?? null,
          startAt: draft.startAt,
          customerNote: note.trim() || undefined,
          idempotencyKey: draft.idempotencyKey,
        }),
      });
      clearDraft();
      router.push(`/salons/${salon.slug}/book/result/${res.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setStartAt(undefined);
        router.replace(`/salons/${salon.slug}/book/datetime`);
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        setSubmitting(false);
      }
    }
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-xl">
        <a
          href={`/salons/${salon.slug}/book/summary`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          ← Back to summary
        </a>

        <div className="mt-4">
          <BookingStepper />
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-text-primary">Confirm your booking</h1>

        {!profile ? (
          <div className="mt-6 animate-pulse space-y-3">
            <div className="h-5 w-48 rounded bg-surface-raised" />
            <div className="h-5 w-32 rounded bg-surface-raised" />
          </div>
        ) : (
          <div className="mt-4 rounded-[var(--radius-sm)] border border-border bg-surface-raised p-4 text-sm">
            <p className="font-medium text-text-primary">{profile.fullName ?? 'Guest'}</p>
            <p className="text-text-secondary">{profile.email}</p>
            {profile.phone && <p className="text-text-secondary">{profile.phone}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="note" className="text-sm font-medium text-text-primary">
              Note for the salon <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <textarea
              id="note"
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Any special requests or information..."
              className="resize-none rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-accent"
            />
            <span className="text-sm text-text-secondary">
              I agree to the{' '}
              <a
                href="/terms"
                className="text-accent underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                terms and conditions
              </a>
              . I understand that late cancellations may incur a fee.
            </span>
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={!termsAccepted || submitting || !profile}
            className="w-full"
          >
            {submitting ? 'Booking…' : 'Confirm booking'}
          </Button>
        </form>
      </div>
    </PublicShell>
  );
}
