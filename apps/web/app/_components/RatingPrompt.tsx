'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch } from '../../lib/api-client';

/** Dismissal is per-session on purpose: closing the prompt should not silence it forever. */
const DISMISS_KEY = 'salonomia.ratingPrompt.dismissed';

interface EligibleReservation {
  id: string;
  startAt: string;
  salon: { name: string; slug: string } | null;
  service: { name: string } | null;
  employee: { fullName: string } | null;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={filled ? '#f59e0b' : 'none'}
      stroke={filled ? '#f59e0b' : '#c4b5fd'}
      strokeWidth="1.6"
    >
      <path
        d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Post-visit rating prompt.
 *
 * Rendered on the customer's own pages. It asks the server which of *their* completed
 * reservations are unrated — the list is derived from the session, never from anything this
 * component is told — and walks through them one at a time.
 *
 * A 401 means the visitor is not signed in; the prompt stays silent rather than surfacing an
 * error, because it is an opportunistic nudge, not part of the page's primary content.
 */
export function RatingPrompt() {
  const t = useTranslations('ratings');

  const [queue, setQueue] = useState<EligibleReservation[]>([]);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.sessionStorage.getItem(DISMISS_KEY) === '1') {
      return;
    }
    setDismissed(false);

    let cancelled = false;
    apiFetch<{ items: EligibleReservation[] }>('/customer/ratings/eligible')
      .then((res) => {
        if (!cancelled) setQueue(res.items ?? []);
      })
      .catch(() => {
        // Not signed in, or the check failed — show nothing.
        if (!cancelled) setQueue([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = dismissed ? undefined : queue[0];

  // Move focus into the dialog when it appears so keyboard users are not left behind the page.
  useEffect(() => {
    if (current) dialogRef.current?.focus();
  }, [current?.id]);

  const dismiss = useCallback(() => {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }, []);

  // Escape closes the dialog, as a modal is expected to.
  const isOpen = Boolean(current);
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, dismiss]);

  function advance() {
    setQueue((q) => q.slice(1));
    setStars(0);
    setComment('');
    setError(null);
  }

  async function submit() {
    if (!current) return;
    if (stars < 1) {
      setError(t('starsRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/customer/ratings', {
        method: 'POST',
        body: JSON.stringify({
          reservationId: current.id,
          stars,
          ...(comment.trim() ? { comment: comment.trim() } : {}),
        }),
      });
      setThanks(true);
      window.setTimeout(() => {
        setThanks(false);
        advance();
      }, 1400);
    } catch {
      setError(t('submitError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!current) return null;

  const salonName = current.salon?.name ?? '';
  const serviceName = current.service?.name ?? '';

  return (
    <div className="sz-rp-backdrop" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sz-rp-title"
        tabIndex={-1}
        className="sz-rp-dialog"
      >
        {thanks ? (
          <p
            role="status"
            style={{
              margin: 0,
              textAlign: 'center',
              fontWeight: 600,
              color: '#166534',
              padding: '1.5rem 0',
            }}
          >
            {t('thanks')}
          </p>
        ) : (
          <>
            <h2
              id="sz-rp-title"
              style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e1b2e' }}
            >
              {t('promptTitle')}
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.86rem', color: '#6b5d8a' }}>
              {t('promptSubtitle', { service: serviceName, salon: salonName })}
            </p>

            <fieldset style={{ border: 0, margin: '1.1rem 0 0', padding: 0 }}>
              <legend
                style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4a3f6b', padding: 0 }}
              >
                {t('chooseStars')}
              </legend>
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="sz-rp-star"
                    aria-label={t('starsLabel', { count: n })}
                    aria-pressed={stars === n}
                    onClick={() => {
                      setStars(n);
                      setError(null);
                    }}
                  >
                    <StarIcon filled={n <= stars} />
                  </button>
                ))}
              </div>
            </fieldset>

            <label
              htmlFor="sz-rp-comment"
              style={{
                display: 'block',
                marginTop: '1rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#4a3f6b',
              }}
            >
              {t('commentLabel')}
            </label>
            <textarea
              id="sz-rp-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('commentPlaceholder')}
              rows={3}
              maxLength={1000}
              className="sz-rp-textarea"
            />

            {error ? (
              <p
                role="alert"
                style={{
                  margin: '0.6rem 0 0',
                  fontSize: '0.82rem',
                  color: '#b91c1c',
                  fontWeight: 600,
                }}
              >
                {error}
              </p>
            ) : null}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.1rem' }}>
              <button
                type="button"
                onClick={dismiss}
                className="sz-rp-btn sz-rp-btn-ghost"
                disabled={submitting}
              >
                {t('later')}
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                className="sz-rp-btn sz-rp-btn-primary"
                disabled={submitting}
              >
                {submitting ? t('submitting') : t('submit')}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        .sz-rp-backdrop {
          position: fixed;
          inset: 0;
          z-index: 60;
          background: rgba(30, 27, 46, 0.45);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 1rem;
        }
        .sz-rp-dialog {
          width: 100%;
          max-width: 420px;
          background: white;
          border-radius: 18px;
          padding: 1.35rem 1.35rem 1.5rem;
          box-shadow: 0 20px 50px rgba(0,0,0,0.22);
          max-height: 90dvh;
          overflow-y: auto;
        }
        .sz-rp-dialog:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
        .sz-rp-star {
          background: none;
          border: 0;
          padding: 4px;
          cursor: pointer;
          border-radius: 8px;
          line-height: 0;
        }
        .sz-rp-star:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
        .sz-rp-textarea {
          width: 100%;
          margin-top: 0.4rem;
          padding: 0.6rem 0.7rem;
          border: 1px solid #d8c2f0;
          border-radius: 10px;
          font-family: inherit;
          font-size: 0.88rem;
          color: #2e2545;
          resize: vertical;
          box-sizing: border-box;
        }
        .sz-rp-textarea:focus-visible { outline: 2px solid #7c3aed; outline-offset: 1px; }
        .sz-rp-btn {
          flex: 1;
          min-height: 44px;
          border-radius: 12px;
          font-family: inherit;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
        }
        .sz-rp-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .sz-rp-btn:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
        .sz-rp-btn-ghost { border: 1.5px solid #d8c2f0; background: white; color: #4a3f6b; }
        .sz-rp-btn-ghost:hover:not(:disabled) { background: #f3e8ff; }
        .sz-rp-btn-primary { border: 1.5px solid #7c3aed; background: #7c3aed; color: white; }
        .sz-rp-btn-primary:hover:not(:disabled) { background: #6d28d9; border-color: #6d28d9; }
        @media (min-width: 640px) {
          .sz-rp-backdrop { align-items: center; }
        }
      `}</style>
    </div>
  );
}
