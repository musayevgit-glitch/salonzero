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
        background: 'rgba(250,245,240,0.96)',
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
              background: '#1a1208', color: 'white',
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

export function MobileBottomNav({ active }: { active: 'home' | 'salons' | 'stilistler' | 'reservations' | 'account' }) {
  const items = [
    {
      key: 'home', href: '/', label: 'Ana səhifə',
      icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 9.5L10 3l7 6.5V17H13v-4H7v4H3V9.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>,
    },
    {
      key: 'salons', href: '/salons', label: 'Salonlar',
      icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" /><path d="M7 10a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
    },
    {
      key: 'reservations', href: '/account/reservations', label: 'Rezervasiyalarım',
      icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" /><path d="M7 9h6M7 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
    },
    {
      key: 'account', href: '/account', label: 'Profil',
      icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.4" /><path d="M4 17c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
    },
  ];

  return (
    <>
      <nav
        aria-label="Əsas naviqasiya"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid #ede5dc',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '0.5rem 0 calc(0.5rem + env(safe-area-inset-bottom))',
          zIndex: 50,
        }}
      >
        {items.map((item) => (
          <a
            key={item.key}
            href={item.href}
            aria-current={active === item.key ? 'page' : undefined}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
              minWidth: 52, textDecoration: 'none',
              color: active === item.key ? '#1a1208' : '#9a8878',
              fontSize: '0.6rem', fontWeight: active === item.key ? 600 : 500,
            }}
          >
            {item.icon}
            {item.label}
          </a>
        ))}
      </nav>
      <style>{`@media (min-width: 768px) { nav[aria-label="Əsas naviqasiya"] { display: none; } }`}</style>
    </>
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
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#faf5f0', paddingBottom: 80 }}>
      <PageHeader isAuthenticated={isAuthenticated} />
      <main style={{ flex: 1, maxWidth, margin: '0 auto', width: '100%', padding: '1.5rem 1.25rem 2rem' }}>
        {children}
      </main>
      <PageFooter />
      <MobileBottomNav active={activeNav} />
      <style>{`@media (min-width: 768px) { div[style*="paddingBottom: 80"] { padding-bottom: 0; } }`}</style>
    </div>
  );
}
