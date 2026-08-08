/* ── Shared Public page wrapper ─────────────────────────── */
'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

const LOCALE_LABELS: Record<string, { flag: string; code: string }> = {
  az: { flag: '🇦🇿', code: 'AZ' },
  en: { flag: '🇬🇧', code: 'EN' },
  ru: { flag: '🇷🇺', code: 'RU' },
  tr: { flag: '🇹🇷', code: 'TR' },
};

function LanguageSwitcher() {
  const params = useParams();
  const currentLocale = (params && params.locale ? (params.locale as string) : 'az') || 'az';

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    document.cookie = `NEXT_LOCALE=${e.target.value};path=/;max-age=31536000;SameSite=Lax`;
    window.location.reload();
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={currentLocale}
        onChange={handleChange}
        aria-label="Select language"
        style={{
          appearance: 'none',
          background: '#f3e8ff',
          border: '1px solid #e4d4f4',
          borderRadius: 10,
          padding: '0.3rem 1.8rem 0.3rem 0.6rem',
          fontSize: '0.78rem',
          fontWeight: 600,
          color: '#1e1b2e',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {Object.entries(LOCALE_LABELS).map(([locale, { flag, code }]) => (
          <option key={locale} value={locale}>
            {flag} {code}
          </option>
        ))}
      </select>
      <span style={{ position: 'absolute', right: '0.4rem', pointerEvents: 'none', fontSize: '0.6rem', color: '#7c6fa0' }}>▾</span>
    </div>
  );
}

export function PageHeader({ isAuthenticated }: { isAuthenticated?: boolean }) {
  const t = useTranslations('nav');
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #e4d4f4',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.25rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.05em', color: '#1e1b2e' }}>
            SALONOMIA
          </span>
        </a>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <a href="/salons" style={{ fontSize: '0.875rem', color: '#6b5d8a', textDecoration: 'none', fontWeight: 500, padding: '0.4rem 0.75rem', borderRadius: 10, display: 'none' }} className="md-show">
            {t('salons')}
          </a>
          <a href="/stilistler" style={{ fontSize: '0.875rem', color: '#6b5d8a', textDecoration: 'none', fontWeight: 500, padding: '0.4rem 0.75rem', borderRadius: 10, display: 'none' }} className="md-show">
            {t('stylists')}
          </a>
          <LanguageSwitcher />
          <a
            href={isAuthenticated ? '/account' : '/login'}
            className="btn-lg btn-lg-primary"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 1.1rem', borderRadius: 12,
              fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M2 12.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            {isAuthenticated ? t('account') : t('login')}
          </a>
        </nav>
      </div>

      <style>{`
        @media (min-width: 768px) { .md-show { display: block !important; } }
      `}</style>
    </header>
  );
}

export function PageFooter() {
  const t = useTranslations('common');
  return (
    <footer style={{ background: 'white', borderTop: '1px solid #e4d4f4', padding: '1.5rem 1.25rem', marginTop: 'auto' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.05em', color: '#1e1b2e' }}>
            SALONOMIA
          </span>
          <div style={{ fontSize: '0.6rem', color: '#7c3aed', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px' }}>
            {t('tagline')}
          </div>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#7c6fa0' }}>
          {t('copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}

/** Shared page layout wrapper */
export function PageLayout({
  children,
  isAuthenticated,
  activeNav = 'home',
  maxWidth = 1280,
}: {
  children: ReactNode;
  isAuthenticated?: boolean;
  activeNav?: 'home' | 'salons' | 'stilistler' | 'reservations' | 'account';
  maxWidth?: number;
}) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'white' }}>
      <PageHeader isAuthenticated={isAuthenticated} />
      <main style={{ flex: 1, maxWidth, margin: '0 auto', width: '100%', padding: '1.5rem 1.25rem 2rem' }}>
        {children}
      </main>
      <PageFooter />
    </div>
  );
}
