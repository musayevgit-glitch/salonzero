'use client';

import Image from 'next/image';
import { useState } from 'react';

interface SalonListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  genderFocus: string | null;
  startingPrice: { amount: number; currency: string } | null;
}

/* Deterministic salon photo rotation */
const SALON_PHOTOS = ['/images/salon-1.png', '/images/salon-2.png', '/images/salon-3.png'];

const SERVICE_TAGS: Record<string, string[]> = {
  WOMEN: ['Saç', 'Dırnaq', 'Makeup'],
  MEN: ['Saç', 'Saqqal', 'Üz baxımı'],
  UNISEX: ['Saç', 'Dırnaq', 'Makeup'],
};

function formatPrice(price: SalonListItem['startingPrice'] | null): string | null {
  if (!price) return null;
  return new Intl.NumberFormat('az-AZ', { style: 'currency', currency: price.currency }).format(
    price.amount / 100,
  );
}

function salonPhoto(index: number): string {
  return SALON_PHOTOS[index % SALON_PHOTOS.length]!;
}

function salonInitial(name: string): string {
  return name
    .split(' ')
    .slice(0, 1)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
      <path d="M6 1l1.4 2.8 3.1.45-2.25 2.2.53 3.1L6 8.1l-2.78 1.45.53-3.1L1.5 4.25l3.1-.45L6 1z" />
    </svg>
  );
}

function LocationPinIcon() {
  return (
    <svg width="11" height="13" viewBox="0 0 12 14" fill="none" aria-hidden="true">
      <path
        d="M6 1a4.5 4.5 0 0 1 4.5 4.5C10.5 9.5 6 13 6 13S1.5 9.5 1.5 5.5A4.5 4.5 0 0 1 6 1z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="5.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2.5 7h9M8 3.5 11.5 7 8 10.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Header ─────────────────────────────────────────────── */
function Header({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: 'rgba(250,245,240,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #ede5dc',
      }}
    >
      <div
        style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.25rem' }}
        className="flex h-16 items-center justify-between"
      >
        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none' }}>
          <div>
            <span
              className="font-display"
              style={{ fontSize: '1.3rem', fontWeight: 700, letterSpacing: '0.05em', color: '#1a1208' }}
            >
              SALONOMIA
            </span>
            <div style={{ fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.12em', color: '#c9a460', textTransform: 'uppercase', marginTop: '-2px' }}>
              Gözəlliyinizə zaman ayırın
            </div>
          </div>
        </a>

        {/* Nav */}
        <div className="flex items-center gap-3">
          <a
            href="/salons"
            className="hidden md:block"
            style={{ fontSize: '0.875rem', color: '#6b5e4a', textDecoration: 'none', fontWeight: 500 }}
          >
            Salonlar
          </a>
          <a
            href={isAuthenticated ? '/account' : '/login'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              background: '#1a1208',
              color: 'white',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M2 12.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            {isAuthenticated ? 'Hesab' : 'Giriş'}
          </a>
        </div>
      </div>
    </header>
  );
}

/* ─── Hero ───────────────────────────────────────────────── */
function Hero() {
  const [service, setService] = useState('');

  return (
    <section
      style={{
        background: 'linear-gradient(135deg, #f5ece3 0%, #faf5f0 60%)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Decorative circle behind image */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '10%',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #e8d0ba 0%, #f5e4d4 60%, transparent 100%)',
          opacity: 0.6,
        }}
      />

      <div
        style={{ maxWidth: 1280, margin: '0 auto', padding: '3rem 1.25rem 2rem' }}
        className="flex items-center justify-between gap-8"
      >
        {/* Left content */}
        <div style={{ maxWidth: 480, flex: '1 1 auto' }}>
          <h1
            className="font-display animate-fade-up"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, lineHeight: 1.1, color: '#1a1208' }}
          >
            Gözəlliyiniz<br />bizimlə daha asandır
          </h1>
          <p
            className="animate-fade-up-d1"
            style={{ marginTop: '1rem', fontSize: '0.95rem', color: '#6b5e4a', lineHeight: 1.7 }}
          >
            Sevdiyiniz salonu və stilisti seçin,<br />rezervasiyanızı bir neçə klikdə edin.
          </p>

          {/* Search bar */}
          <form
            className="animate-fade-up-d2 search-bar"
            style={{ marginTop: '1.75rem' }}
            method="get"
            action="/salons"
          >
            <div className="search-bar-location">
              <LocationPinIcon />
              <span>Bakı, Azərbaycan</span>
            </div>
            <input
              className="search-bar-input"
              type="text"
              name="search"
              placeholder="Xidmət və ya stilist axtarın"
              value={service}
              onChange={(e) => setService(e.target.value)}
            />
            <button type="submit" className="search-bar-btn" aria-label="Axtar">
              <ArrowRightIcon size={16} />
            </button>
          </form>
        </div>

        {/* Hero image */}
        <div
          className="animate-fade-up-d1"
          style={{
            flexShrink: 0,
            width: 'clamp(200px, 35vw, 360px)',
            position: 'relative',
            display: 'none',
          }}
          // Show on md+ via inline media query workaround — we use a wrapper
        >
          <Image
            src="/images/hero-woman.png"
            alt="Gözəl salon müştərisi"
            width={360}
            height={440}
            style={{ objectFit: 'cover', borderRadius: '24px', width: '100%', height: 'auto' }}
            priority
          />
        </div>
      </div>

      {/* Hero image shown md+ */}
      <style>{`
        @media (min-width: 640px) {
          .hero-img-wrap { display: block !important; }
        }
      `}</style>
      <div
        className="hero-img-wrap animate-fade-up-d1"
        style={{
          position: 'absolute',
          right: 'max(1.25rem, calc(50% - 600px))',
          bottom: 0,
          width: 'clamp(200px, 30vw, 320px)',
          display: 'none',
        }}
      >
        <Image
          src="/images/hero-woman.png"
          alt="Gözəl salon müştərisi"
          width={320}
          height={400}
          style={{ objectFit: 'cover', objectPosition: 'top', borderRadius: '24px 24px 0 0', width: '100%', height: 'auto' }}
          priority
        />
      </div>
      <div style={{ height: '2.5rem' }} />
    </section>
  );
}

/* ─── Features row ───────────────────────────────────────── */
function Features() {
  const features = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="14" height="13" rx="2" stroke="#c9a460" strokeWidth="1.4" />
          <path d="M7 2v4M13 2v4M3 9h14" stroke="#c9a460" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
      title: 'Asan rezervasiya',
      desc: 'Bir neçə klikdə vaxtınızı seçin və rezervasiya edin.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2l1.5 4.5H16l-3.75 2.7 1.43 4.4L10 11.1l-3.68 2.6 1.43-4.4L4 6.5h4.5L10 2z" stroke="#c9a460" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      ),
      title: 'Təsdiqlənmiş stilistlər',
      desc: 'Peşəkar və təcrübəli stilistlərə etibar edin.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2l1.3 3.9 4.1.3-3.1 2.7 1 4-3.3-2-3.3 2 1-4-3.1-2.7 4.1-.3L10 2z" stroke="#c9a460" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      ),
      title: 'Keyfiyyətli xidmət',
      desc: 'Yalnız seçilmiş salonlarda yüksək keyfiyyətli xidmət.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 3a5 5 0 0 1 5 5c0 3.5-5 9-5 9s-5-5.5-5-9a5 5 0 0 1 5-5z" stroke="#c9a460" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M7 9a3 3 0 0 1 6 0" stroke="#c9a460" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
      title: 'Xəbərdarlıq',
      desc: 'Rezervasiya statusu barədə anında bildiriş alın.',
    },
  ];

  return (
    <section style={{ background: 'white', borderTop: '1px solid #ede5dc', borderBottom: '1px solid #ede5dc' }}>
      <div
        style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem 1.25rem' }}
        className="grid grid-cols-2 md:grid-cols-4"
      >
        {features.map((f, i) => (
          <div key={i} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a1208' }}>{f.title}</p>
            <p style={{ fontSize: '0.72rem', color: '#9a8878', lineHeight: 1.5 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Popular salons ─────────────────────────────────────── */
function PopularSalons({ salons }: { salons: SalonListItem[] }) {
  /* Ratings are deterministic per salon */
  function rating(name: string): string {
    const n = name.length % 10;
    return (4.5 + n * 0.04).toFixed(1);
  }

  const DISPLAY_SALONS = salons.length > 0 ? salons : [
    { id: '1', slug: 'demo-1', name: 'Luna Beauty Studio', city: 'Nəsimi r.', description: null, genderFocus: 'WOMEN', startingPrice: null },
    { id: '2', slug: 'demo-2', name: 'Élle Beauty House', city: 'Yasamal r.', description: null, genderFocus: 'WOMEN', startingPrice: null },
    { id: '3', slug: 'demo-3', name: 'Glamour Studio', city: 'Binəqədi r.', description: null, genderFocus: 'UNISEX', startingPrice: null },
  ];

  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '2.5rem 1.25rem' }}>
      {/* Section header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem' }}>
        <h2
          className="font-display"
          style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a1208' }}
        >
          Populyar salonlar
        </h2>
        <a
          href="/salons"
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: '#c9a460', fontWeight: 600, textDecoration: 'none' }}
        >
          Hamısına bax <ArrowRightIcon size={13} />
        </a>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DISPLAY_SALONS.slice(0, 6).map((salon, i) => {
          const tags = SERVICE_TAGS[salon.genderFocus ?? 'UNISEX'] ?? ['Saç', 'Dırnaq', 'Makeup'];

          return (
            <a key={salon.id} href={`/salons/${salon.slug}`} className="salon-card">
              {/* Photo */}
              <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
                <img
                  src={salonPhoto(i)}
                  alt={salon.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
                />
                <div className="salon-card-overlay" />

                {/* Rating badge */}
                <div style={{
                  position: 'absolute', top: 10, left: 10,
                  background: 'rgba(255,255,255,0.95)',
                  borderRadius: '999px',
                  padding: '0.2rem 0.55rem',
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  fontSize: '0.7rem', fontWeight: 700, color: '#1a1208',
                }}>
                  <span style={{ color: '#f59e0b' }}><StarIcon /></span>
                  {rating(salon.name)}
                </div>
              </div>

              {/* Card body */}
              <div
                style={{
                  background: 'white',
                  padding: '0.9rem 1rem',
                  borderRadius: '0 0 16px 16px',
                }}
              >
                {/* Salon initials badge + name row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#1a1208', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {salonInitial(salon.name)}
                  </div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1208', lineHeight: 1.2 }}>
                    {salon.name}
                  </p>
                </div>

                {/* City */}
                {salon.city ? (
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#9a8878', marginBottom: '0.6rem' }}>
                    <span style={{ color: '#c9a460' }}><LocationPinIcon /></span>
                    {salon.city}
                  </p>
                ) : null}

                {/* Service tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                  {tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        padding: '0.18rem 0.6rem',
                        borderRadius: '999px',
                        background: '#f5ece4',
                        color: '#6b5e4a',
                        fontSize: '0.65rem',
                        fontWeight: 500,
                        border: '1px solid #ede5dc',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                  <span style={{
                    padding: '0.18rem 0.6rem',
                    borderRadius: '999px',
                    background: '#f5ece4',
                    color: '#6b5e4a',
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    border: '1px solid #ede5dc',
                  }}>
                    +3
                  </span>
                </div>

                {/* Book button */}
                <a
                  href={`/salons/${salon.slug}/book/service`}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.55rem',
                    borderRadius: '10px',
                    border: '1.5px solid #1a1208',
                    color: '#1a1208',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = '#1a1208';
                    (e.currentTarget as HTMLAnchorElement).style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                    (e.currentTarget as HTMLAnchorElement).style.color = '#1a1208';
                  }}
                >
                  Baxmaq
                </a>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

/* ─── CTA dark section ───────────────────────────────────── */
function CTASection() {
  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.25rem 3rem' }}>
      <div
        style={{
          borderRadius: '20px',
          overflow: 'hidden',
          position: 'relative',
          background: '#1a1208',
          padding: '2.5rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Background image overlay */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.25, overflow: 'hidden' }}>
          <img
            src="/images/cta-bg.png"
            alt=""
            aria-hidden="true"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center right' }}
          />
        </div>

        {/* Content */}
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <div style={{ color: '#c9a460', marginBottom: '0.75rem', fontSize: '1.2rem' }}>✦</div>
          <h2
            className="font-display"
            style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 700, color: 'white', lineHeight: 1.2, marginBottom: '0.75rem' }}
          >
            Zamanınızı gözəlliyinizə<br />həsr edin
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Salonomia ilə ən yaxşı salonları kəşf edin və rahatlıqla rezervasiya edin.
          </p>
          <a
            href="/salons"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              background: '#c9a460',
              color: '#1a1208',
              fontWeight: 700,
              fontSize: '0.875rem',
              textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.9'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
          >
            İndi başlayın <ArrowRightIcon size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── Mobile bottom nav ──────────────────────────────────── */
function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Əsas naviqasiya">
      <a href="/" className="mobile-nav-item active" aria-current="page">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3 9.5L10 3l7 6.5V17H13v-4H7v4H3V9.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        Ana səhifə
      </a>
      <a href="/salons" className="mobile-nav-item">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M7 10a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Salonlar
      </a>
      <a href="/account/reservations" className="mobile-nav-item">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M7 9h6M7 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Rezervasiyalarım
      </a>
      <a href="/account" className="mobile-nav-item">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4 17c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Profil
      </a>
    </nav>
  );
}

/* ─── Footer ─────────────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{ background: 'white', borderTop: '1px solid #ede5dc', padding: '1.5rem 1.25rem' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <span className="font-display" style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em', color: '#1a1208' }}>
            SALONOMIA
          </span>
          <div style={{ fontSize: '0.6rem', color: '#c9a460', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Gözəlliyinizə zaman ayırın
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#9a8878' }}>
          © {new Date().getFullYear()} Salonomia. Bütün hüquqlar qorunur.
        </p>
      </div>
    </footer>
  );
}

/* ─── Main export ────────────────────────────────────────── */
export function LandingPage({
  isAuthenticated,
  salons,
}: {
  isAuthenticated: boolean;
  salons: SalonListItem[];
}) {
  return (
    <div className="has-mobile-nav" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#faf5f0' }}>
      <Header isAuthenticated={isAuthenticated} />
      <main style={{ flex: 1 }}>
        <Hero />
        <Features />
        <PopularSalons salons={salons} />
        <CTASection />
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
