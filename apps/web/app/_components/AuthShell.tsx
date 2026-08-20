'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Two-column frame shared by the login and register screens.
 *
 * The left column is pure branding and is hidden below 900px, where the form takes the full
 * width — on a phone a decorative panel would only push the fields below the fold.
 */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  const t = useTranslations('auth');

  return (
    <div className="sz-auth">
      <aside className="sz-auth-brand" aria-hidden="true">
        <span className="sz-auth-orb sz-auth-orb-a" />
        <span className="sz-auth-orb sz-auth-orb-b" />
        <div className="sz-auth-brand-inner">
          <span className="sz-auth-mark">
            <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 1.5l1.75 4.9 4.75 1.85-4.75 1.85L10 15l-1.75-4.9L3.5 8.25l4.75-1.85L10 1.5z"
                fill="currentColor"
              />
            </svg>
            Salonomia
          </span>
          <p className="sz-auth-tagline">{t('tagline')}</p>
        </div>
      </aside>

      <main className="sz-auth-panel">
        <div className="sz-auth-card">
          <a href="/" className="sz-auth-home">
            Salonomia
          </a>
          <h1 className="sz-auth-title">{title}</h1>
          {children}
        </div>
      </main>

      <style>{`
        .sz-auth {
          min-height: 100dvh;
          display: flex;
          background: #f9f6f3;
        }
        .sz-auth-brand { display: none; }
        .sz-auth-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem;
          min-width: 0;
        }
        .sz-auth-card {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border: 1px solid #e4d4f4;
          border-radius: 22px;
          padding: 2rem 1.75rem 2.25rem;
          box-shadow: 0 10px 30px rgba(30,27,46,0.08);
        }
        .sz-auth-home {
          display: inline-block;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: #6A5ACD;
          text-decoration: none;
          letter-spacing: 0.03em;
        }
        .sz-auth-home:focus-visible { outline: 2px solid #7c3aed; outline-offset: 3px; border-radius: 6px; }
        .sz-auth-title {
          margin: 1.25rem 0 1.5rem;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.6rem;
          font-weight: 700;
          color: #1e1b2e;
          line-height: 1.2;
        }

        /* Shared field styling for both auth forms. */
        .sz-auth-form { display: flex; flex-direction: column; gap: 1rem; }
        .sz-auth-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .sz-auth-field label { font-size: 0.82rem; font-weight: 600; color: #4a3f6b; }
        .sz-auth-field input {
          height: 48px;
          box-sizing: border-box;
          width: 100%;
          padding: 0 1rem;
          border: 1px solid #e4d4f4;
          border-radius: 12px;
          font-family: inherit;
          font-size: 0.95rem;
          color: #1e1b2e;
          background: #fff;
          outline: none;
        }
        .sz-auth-field input:hover { border-color: #c4b5fd; }
        .sz-auth-field input:focus-visible {
          border-color: #6A5ACD;
          box-shadow: 0 0 0 3px rgba(106,90,205,0.20);
        }
        .sz-auth-hint { font-size: 0.75rem; color: #9d92bd; }
        .sz-auth-error {
          margin: 0;
          font-size: 0.85rem;
          color: #b91c1c;
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 0.75rem 0.9rem;
          border-radius: 10px;
        }
        .sz-auth-links {
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.86rem;
          color: #7c6fa0;
        }
        .sz-auth-links a { color: #6A5ACD; font-weight: 600; text-decoration: none; }
        .sz-auth-links a:hover { text-decoration: underline; }
        .sz-auth-links a:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; border-radius: 4px; }
        .sz-pw-toggle:hover { background: #f3e8ff; color: #5b21b6; }
        .sz-pw-toggle:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }

        @media (min-width: 900px) {
          .sz-auth-brand {
            position: relative;
            display: flex;
            align-items: flex-end;
            flex: 0 0 44%;
            overflow: hidden;
            padding: 3.5rem;
            background: linear-gradient(150deg, #1e1b2e 0%, #2d1565 55%, #4c1d95 100%);
            color: #fff;
          }
          .sz-auth-orb {
            position: absolute;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(167,139,250,0.35) 0%, transparent 70%);
          }
          .sz-auth-orb-a { width: 420px; height: 420px; top: -120px; right: -140px; }
          .sz-auth-orb-b { width: 320px; height: 320px; bottom: -90px; left: -80px; }
          .sz-auth-brand-inner { position: relative; }
          .sz-auth-mark {
            display: inline-flex;
            align-items: center;
            gap: 0.6rem;
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 2rem;
            font-weight: 700;
            letter-spacing: 0.02em;
            color: #fff;
          }
          .sz-auth-tagline {
            margin: 0.85rem 0 0;
            font-size: 1rem;
            line-height: 1.6;
            color: rgba(220,210,255,0.78);
            max-width: 30ch;
          }
          .sz-auth-card { border: none; box-shadow: none; background: transparent; padding: 0; }
          .sz-auth-panel { padding: 3rem 2.5rem; }
        }
      `}</style>
    </div>
  );
}
