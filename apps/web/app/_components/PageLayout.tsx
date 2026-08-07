/* ── Shared Public page wrapper ─────────────────────────── */
/* Used by /salons, /stilistler, salon detail, auth pages, account pages */

'use client';

import type { ReactNode } from 'react';

export function PageHeader({ isAuthenticated }: { isAuthenticated?: boolean }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #ede5dc',
      }}
    >
      <div
        style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.25rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.05em', color: '#1a1208' }}>
            SALONOMIA
          </span>
        </a>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <a href="/salons" style={{ fontSize: '0.875rem', color: '#6b5e4a', textDecoration: 'none', fontWeight: 500, padding: '0.4rem 0.75rem', borderRadius: 8, display: 'none' }} className="md-show">
            Salonlar
          </a>
          <a href="/stilistler" style={{ fontSize: '0.875rem', color: '#6b5e4a', textDecoration: 'none', fontWeight: 500, padding: '0.4rem 0.75rem', borderRadius: 8, display: 'none' }} className="md-show">
            Stilistlər
          </a>
          <a
            href={isAuthenticated ? '/account' : '/login'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 1rem', borderRadius: 10,
              background: '#5c3d28', color: 'white',
              fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M2 12.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            {isAuthenticated ? 'Hesab' : 'Giriş'}
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
  return (
    <footer style={{ background: 'white', borderTop: '1px solid #ede5dc', padding: '1.5rem 1.25rem', marginTop: 'auto' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.05em', color: '#1a1208' }}>
          SALONOMIA
        </span>
        <p style={{ fontSize: '0.78rem', color: '#9a8878' }}>
          © {new Date().getFullYear()} Salonomia. Bütün hüquqlar qorunur.
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
