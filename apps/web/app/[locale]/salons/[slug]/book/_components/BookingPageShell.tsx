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
}

function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M11.5 14L6 9l5.5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BookingPageShell({ title, backHref, backLabel, children, footer }: BookingPageShellProps) {
  return (
    <div style={{ minHeight: '100dvh', background: 'white', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e4d4f4',
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: '0 auto',
            padding: '0 1rem',
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <a
            href={backHref}
            aria-label={backLabel ?? 'Geri'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'white',
              border: '1px solid #e4d4f4',
              color: '#1e1b2e',
              flexShrink: 0,
              textDecoration: 'none',
              boxShadow: '0 1px 3px rgba(30,27,46,0.06)',
            }}
          >
            <ArrowLeftIcon />
          </a>
          <h1
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#1e1b2e',
              letterSpacing: '0.01em',
            }}
          >
            {title}
          </h1>
          {/* Spacer to center title */}
          <span style={{ width: 36, flexShrink: 0 }} aria-hidden="true" />
        </div>
      </header>

      {/* Stepper */}
      <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', padding: '0 1.25rem' }}>
        <BookingStepper />
      </div>

      {/* Content */}
      <main
        style={{
          flex: 1,
          maxWidth: 600,
          margin: '0 auto',
          width: '100%',
          padding: '0 1rem',
          paddingBottom: footer ? '100px' : '2rem',
        }}
      >
        {children}
      </main>

      {/* Sticky footer CTA */}
      {footer ? (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid #e4d4f4',
            padding: '0.875rem 1rem calc(0.875rem + env(safe-area-inset-bottom))',
            zIndex: 30,
          }}
        >
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {footer}
          </div>
        </div>
      ) : null}
    </div>
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
