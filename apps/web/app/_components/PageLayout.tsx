/* ── Shared Public page wrapper ─────────────────────────── */
'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

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
  // Below 768px the inline nav links are hidden, so without this drawer the Salons and Stylists
  // destinations were simply unreachable on a phone.
  const [menuOpen, setMenuOpen] = useState(false);

  // Escape closes the drawer, and an open drawer locks background scroll.
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    // At >=768px the drawer is hidden by CSS, so it must also give the scroll lock back —
    // otherwise widening the window leaves the page unscrollable with no visible menu to close.
    const desktop = window.matchMedia('(min-width: 768px)');
    function onDesktopChange() {
      if (desktop.matches) setMenuOpen(false);
    }
    desktop.addEventListener('change', onDesktopChange);
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      desktop.removeEventListener('change', onDesktopChange);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

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

          <button
            type="button"
            className="sz-burger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="sz-mobile-nav"
            aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              {menuOpen ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </nav>
      </div>

      {menuOpen ? (
        <>
          {/* Clicking the scrim dismisses the drawer. It is hidden from the a11y tree because the
              close button and Escape already provide accessible ways out. */}
          <div className="sz-scrim" aria-hidden="true" onClick={() => setMenuOpen(false)} />
          <div id="sz-mobile-nav" className="sz-drawer">
            <a
              href="/salons"
              className="sz-drawer-link"
              aria-current={activeNav === 'salons' ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {t('salons')}
            </a>
            <a
              href="/stilistler"
              className="sz-drawer-link"
              aria-current={activeNav === 'stilistler' ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {t('stylists')}
            </a>
            {isAuthenticated ? (
              <a
                href="/account/reservations"
                className="sz-drawer-link"
                aria-current={activeNav === 'reservations' ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {t('reservations')}
              </a>
            ) : null}
          </div>
        </>
      ) : null}

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

        /* Hamburger — the mobile counterpart to the inline links. */
        .sz-burger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: 1px solid #d8c2f0;
          border-radius: 10px;
          background: #f3e8ff;
          color: #4a3f6b;
          cursor: pointer;
          padding: 0;
        }
        .sz-burger:hover { background: #e9d8fd; }
        .sz-burger:focus-visible,
        .sz-drawer-link:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }

        .sz-scrim {
          position: fixed;
          inset: 64px 0 0 0;
          background: rgba(20, 12, 40, 0.35);
          z-index: 30;
        }
        .sz-drawer {
          position: relative;
          z-index: 31;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          padding: 0.6rem 1.25rem 1rem;
          background: white;
          border-bottom: 1px solid #e4d4f4;
          box-shadow: 0 16px 32px rgba(20, 12, 40, 0.12);
        }
        .sz-drawer-link {
          display: block;
          padding: 0.75rem 0.5rem;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          color: #4a3f6b;
          text-decoration: none;
        }
        .sz-drawer-link:hover { background: #f3e8ff; color: #5b21b6; }
        .sz-drawer-link[aria-current='page'] { background: #f3e8ff; color: #5b21b6; }

        @media (min-width: 768px) {
          .sz-nav-link { display: block; }
          /* The drawer exists only where the inline links are hidden. */
          .sz-burger, .sz-drawer, .sz-scrim { display: none; }
        }
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
