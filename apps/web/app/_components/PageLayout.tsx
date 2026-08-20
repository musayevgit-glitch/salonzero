/* ── Shared Public page wrapper ─────────────────────────── */
'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { NotificationBell } from './NotificationBell';

export type NavKey = 'home' | 'salons' | 'stilistler' | 'reservations' | 'account';

const LOCALE_LABELS: Record<string, { flag: string; code: string }> = {
  az: { flag: '🇦🇿', code: 'AZ' },
  en: { flag: '🇬🇧', code: 'EN' },
  ru: { flag: '🇷🇺', code: 'RU' },
  tr: { flag: '🇹🇷', code: 'TR' },
};

function LanguageSwitcher() {
  const params = useParams();
  const t = useTranslations('nav');
  const currentLocale = (params && params.locale ? (params.locale as string) : 'az') || 'az';

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    document.cookie = `NEXT_LOCALE=${e.target.value};path=/;max-age=31536000;SameSite=Lax`;
    window.location.reload();
  }

  return (
    <select
      value={currentLocale}
      onChange={handleChange}
      aria-label={t('language')}
      className="sz-lang-select"
    >
      {Object.entries(LOCALE_LABELS).map(([locale, { flag, code }]) => (
        <option key={locale} value={locale}>
          {flag} {code}
        </option>
      ))}
    </select>
  );
}

export function PageHeader({
  isAuthenticated,
  activeNav,
}: {
  isAuthenticated?: boolean;
  activeNav?: NavKey;
}) {
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

        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <a
            href="/salons"
            className="sz-nav-link"
            aria-current={activeNav === 'salons' ? 'page' : undefined}
          >
            {t('salons')}
          </a>
          <a
            href="/stilistler"
            className="sz-nav-link"
            aria-current={activeNav === 'stilistler' ? 'page' : undefined}
          >
            {t('stylists')}
          </a>
          <LanguageSwitcher />
          {/* The bell polls an authenticated endpoint, so it only exists for signed-in visitors. */}
          {isAuthenticated ? <NotificationBell /> : null}
          <a
            href={isAuthenticated ? '/account' : '/login'}
            className="btn-lg btn-lg-primary sz-nav-cta"
            aria-current={activeNav === 'account' ? 'page' : undefined}
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
        /* Nav links: #4a3f6b on white is ~8.4:1, comfortably above WCAG AA for body text
           (the previous #6b5d8a sat at ~4.9:1 and read as disabled). */
        .sz-nav-link {
          display: none;
          font-size: 0.875rem;
          font-weight: 600;
          color: #4a3f6b;
          text-decoration: none;
          padding: 0.45rem 0.8rem;
          border-radius: 10px;
          transition: background 0.15s, color 0.15s;
        }
        .sz-nav-link:hover { background: #f3e8ff; color: #5b21b6; }
        .sz-nav-link[aria-current='page'] { color: #5b21b6; background: #f3e8ff; }
        .sz-nav-link:focus-visible,
        .sz-nav-cta:focus-visible,
        .sz-lang-select:focus-visible {
          outline: 2px solid #7c3aed;
          outline-offset: 2px;
        }
        .sz-nav-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1.1rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
        }
        .sz-lang-select {
          appearance: none;
          -webkit-appearance: none;
          background-color: #f3e8ff;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' stroke='%235b21b6' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.55rem center;
          border: 1px solid #d8c2f0;
          border-radius: 10px;
          padding: 0.4rem 1.75rem 0.4rem 0.65rem;
          font-size: 0.78rem;
          font-weight: 600;
          font-family: inherit;
          color: #2e2545;
          cursor: pointer;
          min-height: 36px;
        }
        .sz-lang-select:hover { background-color: #e9d8fd; border-color: #c4b5fd; }
        @media (min-width: 768px) { .sz-nav-link { display: block; } }
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
  activeNav?: NavKey;
  maxWidth?: number;
}) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'white' }}>
      <PageHeader isAuthenticated={isAuthenticated} activeNav={activeNav} />
      <main style={{ flex: 1, maxWidth, margin: '0 auto', width: '100%', padding: '1.5rem 1.25rem 2rem' }}>
        {children}
      </main>
      <PageFooter />
    </div>
  );
}
