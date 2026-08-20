'use client';

import type { ReactNode } from 'react';
import { BookingStepper } from './BookingStepper';

interface BookingPageShellProps {
  title: string;
  backHref: string;
  backLabel?: string;
  children: ReactNode;
  /** Sticky CTA button at bottom */
  footer?: ReactNode;
  /** 1-based booking step: 1 = service, 2 = stylist, 3 = datetime, 4 = confirm. */
  step?: number;
}

function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M11.5 14L6 9l5.5-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookingPageShell({
  title,
  backHref,
  backLabel,
  children,
  footer,
  step,
}: BookingPageShellProps) {
  return (
    <main className="sz-book-main" data-has-footer={footer ? 'true' : 'false'}>
      <div style={{ maxWidth: 600, margin: '0 auto', width: '100%' }}>
        {/* Back link + title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '1.25rem',
          }}
        >
          <a href={backHref} aria-label={backLabel ?? 'Geri'} className="sz-book-back">
            <ArrowLeftIcon />
            <span>{backLabel ?? 'Geri'}</span>
          </a>
        </div>

        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1e1b2e',
            textAlign: 'center',
            marginBottom: '1.25rem',
          }}
        >
          {title}
        </h1>

        <BookingStepper step={step} />

        {/* Content card */}
        <div className="sz-book-card">{children}</div>
      </div>

      {footer ? (
        <div className="sz-book-footer">
          <div style={{ maxWidth: 600, margin: '0 auto' }}>{footer}</div>
        </div>
      ) : null}

      <style>{`
        .sz-book-main {
          flex: 1;
          width: 100%;
          padding: 1.5rem 1rem 2rem;
        }
        .sz-book-back {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.75rem 0.4rem 0.5rem;
          border-radius: 10px;
          background: transparent;
          border: 1px solid transparent;
          color: #6b5d8a;
          font-size: 0.82rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
        }
        .sz-book-back:hover { background: #f3e8ff; color: #5b21b6; }
        .sz-book-back:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
        .sz-book-card {
          background: #ffffff;
          border: 1px solid #efe6f7;
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 4px 20px rgba(30,27,46,0.06);
        }
        /* Mobile: the CTA is pinned so it stays reachable with one thumb. */
        .sz-book-main[data-has-footer='true'] { padding-bottom: 108px; }
        .sz-book-footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid #e4d4f4;
          padding: 0.875rem 1rem calc(0.875rem + env(safe-area-inset-bottom));
          z-index: 30;
        }
        @media (min-width: 768px) {
          .sz-book-main { padding: 2.5rem 1.25rem 3rem; }
          .sz-book-main[data-has-footer='true'] { padding-bottom: 3rem; }
          .sz-book-card { padding: 2rem; }
          /* Desktop: the CTA rejoins normal flow directly under the card. */
          .sz-book-footer {
            position: static;
            background: transparent;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            border-top: none;
            padding: 1.25rem 0 0;
          }
        }
      `}</style>
    </main>
  );
}

/** Full-width dark CTA button matching the design */
export function BookingCTAButton({
  label,
  onClick,
  disabled,
  loading,
  type = 'button',
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      style={{
        width: '100%',
        minHeight: 52,
        borderRadius: 14,
        background: disabled || loading ? '#c5bbb2' : '#7c3aed',
        color: 'white',
        fontSize: '1rem',
        fontWeight: 700,
        border: 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        transition: 'opacity 0.15s, background 0.15s',
        letterSpacing: '0.01em',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = '1';
      }}
    >
      {loading ? '…' : label}
    </button>
  );
}
