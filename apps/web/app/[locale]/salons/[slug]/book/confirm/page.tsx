'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '../../../../../../lib/api-client';
import { useBookingContext } from '../_components/BookingContext';
import { BookingCTAButton, BookingPageShell } from '../_components/BookingPageShell';

interface CustomerProfile {
  fullName: string | null;
  phone: string | null;
  email: string;
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6" stroke="#6b5d8a" strokeWidth="1.3" />
      <path d="M7 6.5v3.5M7 4.5v.5" stroke="#6b5d8a" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export default function ConfirmStep() {
  const { salon, draft, draftLoaded, clearDraft, setStartAt } = useBookingContext();
  // draft.holdId is released automatically when clearDraft() is called (sessionStorage cleared),
  // but we also DELETE it from the server so it frees the slot immediately.
  const router = useRouter();
  const t = useTranslations('booking');

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [note, setNote] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileLoaded = useRef(false);

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
      const holdId = draft.holdId;
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
      // Release the slot hold now that the reservation is created
      if (holdId) {
        void fetch(`/api/reservations/slot-holds/${holdId}`, { method: 'DELETE' });
      }
      clearDraft();
      router.push('/account/reservations');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setStartAt(undefined);
        router.replace(`/salons/${salon.slug}/book/datetime`);
      } else {
        setError(err instanceof Error ? err.message : 'Bir xəta baş verdi. Yenidən cəhd edin.');
        setSubmitting(false);
      }
    }
  }

  return (
    <BookingPageShell
      title={t('confirm')}
      backHref={`/salons/${salon.slug}/book/summary`}
      backLabel={t('backToSummary')}
      footer={
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {/* Terms */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              cursor: 'pointer',
              padding: '0.75rem',
              borderRadius: 12,
              background: termsAccepted ? '#fffbf2' : 'white',
              border: `1px solid ${termsAccepted ? '#7c3aed' : '#e4d4f4'}`,
              transition: 'all 0.15s',
            }}
          >
            <div
              style={{
                width: 20, height: 20, borderRadius: 6,
                border: `2px solid ${termsAccepted ? '#7c3aed' : '#c5bbb2'}`,
                background: termsAccepted ? '#7c3aed' : 'white',
                flexShrink: 0, marginTop: '0.05rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {termsAccepted && (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                  <path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
              aria-label={t('termsAccept')}
            />
            <span style={{ fontSize: '0.78rem', color: '#6b5d8a', lineHeight: 1.5 }}>
              {t('termsText').split('{link}')[0]}
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
                {t('termsLink')}
              </a>
              {t('termsText').split('{link}')[1]}
            </span>
          </label>

          {error && (
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '0.75rem', fontSize: '0.82rem', color: '#9b1c1c' }}>
              {error}
            </div>
          )}

          <BookingCTAButton
            label={submitting ? t('submitting') : t('createReservation')}
            type="submit"
            disabled={!termsAccepted || !profile}
            loading={submitting}
          />
          <p style={{ textAlign: 'center', fontSize: '0.68rem', color: '#a994c9' }}>
            Rezervasiya yaratmaqla qaydaları qəbul etmiş olursunuz.
          </p>
        </form>
      }
    >
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1b2e', marginBottom: '1rem' }}>
        {t('myInfo')}
      </h2>

      {/* Profile card */}
      {!profile ? (
        <div style={{ background: 'white', border: '1px solid #e4d4f4', borderRadius: 14, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ height: 16, width: '60%', borderRadius: 8, background: '#f0e8e0', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: 14, width: '40%', borderRadius: 8, background: '#f0e8e0', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      ) : (
        <div
          style={{
            background: 'white',
            border: '1px solid #e4d4f4',
            borderRadius: 14,
            padding: '1rem 1.25rem',
            boxShadow: '0 1px 4px rgba(30,27,46,0.05)',
            marginBottom: '1rem',
          }}
        >
          <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e1b2e' }}>{profile.fullName ?? t('guestName')}</p>
          <p style={{ fontSize: '0.8rem', color: '#7c6fa0', marginTop: '0.2rem' }}>{profile.email}</p>
          {profile.phone && <p style={{ fontSize: '0.8rem', color: '#7c6fa0', marginTop: '0.1rem' }}>{profile.phone}</p>}
        </div>
      )}

      {/* Note field */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label
          htmlFor="note"
          style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e1b2e', marginBottom: '0.5rem' }}
        >
          {t('noteLabel')}{' '}
          <span style={{ fontWeight: 400, color: '#7c6fa0' }}>{t('noteOptional')}</span>
        </label>
        <textarea
          id="note"
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={t('notePlaceholder')}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: 12,
            border: '1.5px solid #e4d4f4',
            background: 'white',
            fontSize: '0.85rem',
            color: '#1e1b2e',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.6,
            transition: 'border-color 0.15s',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#7c3aed'; }}
          onBlur={(e) => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#e4d4f4'; }}
        />
      </div>

      {/* Payment info note */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0 0.25rem' }}>
        <InfoIcon />
        <p style={{ fontSize: '0.75rem', color: '#7c6fa0' }}>{t('paymentNote')}</p>
      </div>
    </BookingPageShell>
  );
}
