/* ── Shared Public page wrapper ─────────────────────────── */
'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
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

/**
 * Locale routing is configured with `localePrefix: 'never'`, so every public link is written
 * without a `/{locale}` segment — the middleware resolves the active locale from the
 * NEXT_LOCALE cookie. Prefixing hrefs here would produce 404s.
 */

function LanguageSwitcher({ className }: { className?: string }) {
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
      className={className ? `sz-lang-select ${className}` : 'sz-lang-select'}
    >
      {Object.entries(LOCALE_LABELS).map(([locale, { flag, code }]) => (
        <option key={locale} value={locale}>
          {flag} {code}
        </option>
      ))}
    </select>
  );
}

/** Wordmark glyph — a sparkle, drawn inline so no icon dependency is pulled in. */
function SparkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 1.5l1.75 4.9 4.75 1.85-4.75 1.85L10 15l-1.75-4.9L3.5 8.25l4.75-1.85L10 1.5z"
        fill="currentColor"
      />
      <path d="M15.8 13.2l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9z" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

function Wordmark({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const color = tone === 'light' ? '#6A5ACD' : '#ffffff';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color }}>
      <SparkIcon />
      <span
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '1.2rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
        }}
      >
        Salonomia
      </span>
    </span>
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
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid #f0e8f5',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 1.25rem',
          height: 68,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <a href="/" style={{ textDecoration: 'none', flexShrink: 0 }} aria-label="Salonomia">
          <Wordmark />
        </a>

        {/* Centre rail — collapses into the drawer below 768px. */}
        <nav className="sz-center-nav" aria-label="Salonomia">
          <a href="/salons" className="sz-nav-link" aria-current={activeNav === 'salons' ? 'page' : undefined}>
            {t('salons')}
          </a>
          <a
            href="/stilistler"
            className="sz-nav-link"
            aria-current={activeNav === 'stilistler' ? 'page' : undefined}
          >
            {t('stylists')}
          </a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <LanguageSwitcher className="sz-lang-desktop" />
          {/* The bell polls an authenticated endpoint, so it only exists for signed-in visitors. */}
          {isAuthenticated ? <NotificationBell /> : null}
          <a
            href={isAuthenticated ? '/account' : '/login'}
            className="sz-nav-cta"
            aria-current={activeNav === 'account' ? 'page' : undefined}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M2 12.5c0-2.76 2.24-5 5-5s5 2.24 5 5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            <span className="sz-cta-label">{isAuthenticated ? t('account') : t('login')}</span>
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
        </div>
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
              <>
                <a
                  href="/account/reservations"
                  className="sz-drawer-link"
                  aria-current={activeNav === 'reservations' ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {t('reservations')}
                </a>
                <a
                  href="/account"
                  className="sz-drawer-link"
                  aria-current={activeNav === 'account' ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {t('account')}
                </a>
              </>
            ) : (
              <a href="/login" className="sz-drawer-link" onClick={() => setMenuOpen(false)}>
                {t('login')}
              </a>
            )}
            <div className="sz-drawer-foot">
              <LanguageSwitcher />
            </div>
          </div>
        </>
      ) : null}

      <style>{`
        /* Nav links: #4a3f6b on white is ~8.4:1, comfortably above WCAG AA for body text. */
        .sz-center-nav { display: none; align-items: center; gap: 0.25rem; }
        .sz-nav-link {
          font-size: 0.9rem;
          font-weight: 600;
          color: #4a3f6b;
          text-decoration: none;
          padding: 0.5rem 0.9rem;
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
          padding: 0.55rem 1.05rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          background: #6A5ACD;
          color: #fff;
          box-shadow: 0 4px 14px rgba(106,90,205,0.28);
          transition: background 0.15s, box-shadow 0.15s;
        }
        .sz-nav-cta:hover { background: #5c4cbe; box-shadow: 0 6px 18px rgba(106,90,205,0.34); }
        .sz-lang-select {
          appearance: none;
          -webkit-appearance: none;
          background-color: #f3e8ff;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' stroke='%235b21b6' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.55rem center;
          border: 1px solid #e4d4f4;
          border-radius: 10px;
          padding: 0.4rem 1.75rem 0.4rem 0.65rem;
          font-size: 0.78rem;
          font-weight: 600;
          font-family: inherit;
          color: #2e2545;
          cursor: pointer;
          min-height: 38px;
        }
        .sz-lang-select:hover { background-color: #e9d8fd; border-color: #c4b5fd; }
        .sz-lang-desktop { display: none; }

        /* Hamburger — the mobile counterpart to the inline links. */
        .sz-burger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border: 1px solid #e4d4f4;
          border-radius: 10px;
          background: #f9f6f3;
          color: #4a3f6b;
          cursor: pointer;
          padding: 0;
        }
        .sz-burger:hover { background: #f3e8ff; }
        .sz-burger:focus-visible,
        .sz-drawer-link:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }

        .sz-scrim {
          position: fixed;
          inset: 68px 0 0 0;
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
          border-bottom: 1px solid #f0e8f5;
          box-shadow: 0 16px 32px rgba(20, 12, 40, 0.12);
        }
        .sz-drawer-link {
          display: block;
          padding: 0.8rem 0.6rem;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          color: #4a3f6b;
          text-decoration: none;
        }
        .sz-drawer-link:hover { background: #f3e8ff; color: #5b21b6; }
        .sz-drawer-link[aria-current='page'] { background: #f3e8ff; color: #5b21b6; }
        .sz-drawer-foot { padding: 0.6rem 0.6rem 0; border-top: 1px solid #f0e8f5; margin-top: 0.5rem; }

        @media (max-width: 400px) { .sz-cta-label { display: none; } }
        @media (min-width: 768px) {
          .sz-center-nav { display: flex; }
          .sz-lang-desktop { display: inline-block; }
          /* The drawer exists only where the inline links are hidden. */
          .sz-burger, .sz-drawer, .sz-scrim { display: none; }
        }
      `}</style>
    </header>
  );
}

export function PageFooter() {
  const t = useTranslations('common');
  const tn = useTranslations('nav');
  return (
    <footer
      style={{
        background: '#1e1b2e',
        color: '#cfc6e4',
        padding: '3rem 1.25rem 2rem',
        marginTop: 'auto',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div className="sz-foot-grid">
          <div style={{ minWidth: 0 }}>
            <Wordmark tone="dark" />
            <p
              style={{
                marginTop: '0.75rem',
                fontSize: '0.85rem',
                lineHeight: 1.6,
                color: '#9d92bd',
                maxWidth: 280,
              }}
            >
              {t('footerTagline')}
            </p>
          </div>

          <div>
            <h2 className="sz-foot-title">{t('footerNav')}</h2>
            <ul className="sz-foot-list">
              <li>
                <a href="/salons" className="sz-foot-link">
                  {tn('salons')}
                </a>
              </li>
              <li>
                <a href="/stilistler" className="sz-foot-link">
                  {tn('stylists')}
                </a>
              </li>
              <li>
                <a href="/account/reservations" className="sz-foot-link">
                  {tn('reservations')}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="sz-foot-title">{t('footerCompany')}</h2>
            <ul className="sz-foot-list">
              <li>
                <a href="/terms" className="sz-foot-link">
                  {t('terms')}
                </a>
              </li>
              <li>
                <a href="mailto:info@salonomia.az" className="sz-foot-link">
                  {t('contact')}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="sz-foot-title">{t('footerSocial')}</h2>
            <ul className="sz-foot-list">
              <li>
                <a href="/terms" className="sz-foot-link">
                  Instagram
                </a>
              </li>
              <li>
                <a href="/terms" className="sz-foot-link">
                  Facebook
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p
          style={{
            marginTop: '2.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.09)',
            fontSize: '0.78rem',
            color: '#8479a3',
          }}
        >
          {t('copyright', { year: new Date().getFullYear() })}
        </p>
      </div>

      <style>{`
        .sz-foot-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        .sz-foot-title {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #a78bfa;
          margin: 0 0 0.85rem 0;
        }
        .sz-foot-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
        .sz-foot-link { font-size: 0.875rem; color: #cfc6e4; text-decoration: none; }
        .sz-foot-link:hover { color: #ffffff; text-decoration: underline; }
        .sz-foot-link:focus-visible { outline: 2px solid #a78bfa; outline-offset: 3px; border-radius: 4px; }
        @media (min-width: 640px) { .sz-foot-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 960px) { .sz-foot-grid { grid-template-columns: 2fr 1fr 1fr 1fr; gap: 3rem; } }
      `}</style>
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
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f9f6f3',
      }}
    >
      <PageHeader isAuthenticated={isAuthenticated} activeNav={activeNav} />
      <main
        style={{
          flex: 1,
          maxWidth,
          margin: '0 auto',
          width: '100%',
          padding: '2rem 1.25rem 3rem',
        }}
      >
        {children}
      </main>
      <PageFooter />
    </div>
  );
}
