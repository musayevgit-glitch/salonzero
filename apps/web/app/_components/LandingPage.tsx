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

import { formatMoney } from '../../lib/format-money';

function formatPrice(price: SalonListItem['startingPrice'] | null): string | null {
  if (!price) return null;
  return formatMoney(price.amount);
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
        background: 'rgba(255,255,255,0.95)',
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
              background: '#5c3d28',
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
const HERO_IMAGES = ['/images/salon-1.png', '/images/salon-2.png', '/images/salon-3.png'];

function Hero() {
  const [query, setQuery] = useState('');

  return (
    <section style={{ position: 'relative', overflow: 'hidden', minHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes satinShift {
          0%   { background-position: 0% 0%; }
          33%  { background-position: 100% 50%; }
          66%  { background-position: 50% 100%; }
          100% { background-position: 0% 0%; }
        }
        @keyframes wordUp {
          from { opacity: 0; transform: translateY(40px) skewY(3deg); }
          to   { opacity: 1; transform: translateY(0) skewY(0deg); }
        }
        @keyframes floatImg {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes floatImg2 {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-8px) rotate(1deg); }
        }
        @keyframes goldPulse {
          0%, 100% { opacity: 0.12; transform: scale(1); }
          50%       { opacity: 0.28; transform: scale(1.08); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50%       { opacity: 0.7; transform: scale(1); }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes badgePop {
          from { opacity: 0; transform: scale(0.8) translateY(-8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes lineGrow {
          from { width: 0; }
          to   { width: 100%; }
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .hero-satin {
          background: linear-gradient(
            135deg,
            #0f0603 0%,
            #2a1008 12%,
            #4a2010 22%,
            #8b5020 33%,
            #c9a460 44%,
            #f0dfc0 50%,
            #c9a460 56%,
            #8b5020 67%,
            #4a2010 78%,
            #2a1008 88%,
            #0f0603 100%
          );
          background-size: 500% 500%;
          animation: satinShift 13s ease-in-out infinite;
        }
        .hw { display: inline-block; opacity: 0; animation: wordUp 0.65s cubic-bezier(.22,.68,0,1.2) forwards; }
        .hw1 { animation-delay: 0.1s; }
        .hw2 { animation-delay: 0.25s; }
        .hw3 { animation-delay: 0.4s; }
        .hbadge { opacity: 0; animation: badgePop 0.5s cubic-bezier(.34,1.56,.64,1) 0.05s forwards; }
        .himg1 { animation: floatImg 7s ease-in-out 0.3s infinite; }
        .himg2 { animation: floatImg2 9s ease-in-out 1s infinite; }
        .himg3 { animation: floatImg 11s ease-in-out 2s infinite; }
        .hform { opacity: 0; animation: fadeSlide 0.6s ease 0.7s forwards; }
        .gold-line-anim { display: block; height: 3px; background: linear-gradient(90deg, #c9a460, #f0d080, #c9a460); border-radius: 2px; width: 0; animation: lineGrow 0.8s ease 0.6s forwards; }
        @media (max-width: 767px) {
          .hero-cols { flex-direction: column !important; }
          .hero-right { display: none !important; }
          .hero-left { max-width: 100% !important; }
          .hero-h1 { font-size: 2.4rem !important; }
        }
      `}</style>

      {/* Animated luxury gradient */}
      <div className="hero-satin" aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* Left scrim — mətn oxunaqlığı üçün */}
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '60%', background: 'linear-gradient(90deg, rgba(10,4,2,0.72) 0%, rgba(10,4,2,0.4) 65%, transparent 100%)', pointerEvents: 'none' }} />

      {/* Top + bottom vignette */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,3,1,0.35) 0%, transparent 30%, transparent 70%, rgba(8,3,1,0.25) 100%)', pointerEvents: 'none' }} />

      {/* Gold sparkle dots */}
      {[
        { top: '12%', left: '8%', d: '0s', s: 7 },
        { top: '22%', left: '48%', d: '0.8s', s: 4 },
        { top: '65%', left: '5%', d: '1.4s', s: 5 },
        { top: '78%', left: '52%', d: '0.3s', s: 3 },
        { top: '40%', left: '30%', d: '2s', s: 6 },
        { top: '88%', left: '22%', d: '1s', s: 4 },
        { top: '18%', left: '70%', d: '1.6s', s: 5 },
        { top: '55%', left: '62%', d: '0.5s', s: 3 },
      ].map((p, i) => (
        <div key={i} aria-hidden="true" style={{
          position: 'absolute', top: p.top, left: p.left,
          width: p.s, height: p.s, borderRadius: '50%',
          background: '#c9a460',
          animation: `sparkle ${3 + i * 0.4}s ease-in-out ${p.d} infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Main content */}
      <div className="hero-cols" style={{ maxWidth: 1280, margin: '0 auto', padding: '4rem 1.5rem 3rem', flex: 1, display: 'flex', alignItems: 'center', gap: '3rem', width: '100%', position: 'relative' }}>

        {/* ── LEFT ── */}
        <div className="hero-left" style={{ flex: '0 0 52%', maxWidth: 580 }}>

          {/* Headline */}
          <h1 className="hero-h1 font-display" style={{ fontSize: 'clamp(2.6rem, 5.5vw, 4rem)', fontWeight: 800, lineHeight: 1.08, color: 'white', margin: 0 }}>
            <span className="hw hw1">Gözəlliyiniz</span>{' '}
            <br />
            <span className="hw hw2" style={{ background: 'linear-gradient(135deg, #f0d080 0%, #c9a460 50%, #e8c070 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>öz əlinizdə.</span>
          </h1>

          {/* Gold underline */}
          <span className="gold-line-anim" style={{ marginTop: '0.6rem', maxWidth: 260 }} />

          {/* Subtitle */}
          <p className="hw hw3" style={{ marginTop: '1.25rem', fontSize: '1rem', color: 'rgba(240,220,190,0.75)', lineHeight: 1.75, fontWeight: 400 }}>
            Salon seçin, stilist tapın, bir neçə klikdə<br/>rezervasiyanızı tamamlayın.
          </p>

          {/* Search */}
          <form
            className="hform"
            method="get"
            action="/salons"
            style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(201,164,96,0.3)', borderRadius: 16, padding: '0.4rem 0.4rem 0.4rem 1.1rem', gap: '0.5rem', backdropFilter: 'blur(20px)', maxWidth: 480, boxShadow: '0 4px 32px rgba(0,0,0,0.3)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, color: '#c9a460' }}>
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              name="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Xidmət, salon və ya stilist axtarın..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: '0.9rem' } as React.CSSProperties}
            />
            <button
              type="submit"
              style={{ flexShrink: 0, background: 'linear-gradient(135deg, #c9a460, #a07030)', border: 'none', borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', boxShadow: '0 4px 14px rgba(180,140,60,0.5)' }}
              aria-label="Axtar"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>

        {/* ── RIGHT — image collage ── */}
        <div className="hero-right" style={{ flex: 1, position: 'relative', minHeight: 480, display: 'flex' }}>

          {/* Background glow behind images */}
          <div aria-hidden="true" style={{ position: 'absolute', top: '15%', left: '10%', width: '70%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,164,96,0.18) 0%, transparent 70%)', animation: 'goldPulse 6s ease-in-out infinite', pointerEvents: 'none' }} />

          {/* Image 1 — large, top */}
          <div className="himg1" style={{ position: 'absolute', top: 0, left: '5%', width: '58%', height: 280, borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(201,164,96,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <img src={HERO_IMAGES[0]} alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(13,8,5,0.4) 100%)' }} />
            {/* Floating rating chip */}
            <div style={{ position: 'absolute', bottom: 14, left: 14, background: 'rgba(13,8,5,0.85)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(201,164,96,0.3)' }}>
              <span style={{ color: '#f0d080', fontSize: '0.75rem' }}>★</span>
              <span style={{ color: 'white', fontSize: '0.72rem', fontWeight: 600 }}>4.9 · Gözəl Xanım Beauty</span>
            </div>
          </div>

          {/* Image 2 — smaller, top-right */}
          <div className="himg2" style={{ position: 'absolute', top: 20, right: 0, width: '38%', height: 190, borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(201,164,96,0.2)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
            <img src={HERO_IMAGES[1]} alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>

          {/* Image 3 — bottom-right */}
          <div className="himg3" style={{ position: 'absolute', bottom: 0, right: '5%', width: '50%', height: 200, borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(201,164,96,0.2)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
            <img src={HERO_IMAGES[2]} alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, rgba(13,8,5,0.35) 100%)' }} />
          </div>

          {/* Floating booking chip */}
          <div className="hbadge" style={{ position: 'absolute', bottom: 18, left: '2%', background: 'rgba(13,8,5,0.9)', backdropFilter: 'blur(12px)', borderRadius: 14, padding: '0.7rem 1rem', border: '1px solid rgba(201,164,96,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 140 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>İndi mövcud</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'white', fontWeight: 700 }}>Bu gün rezervasiya</div>
            <div style={{ fontSize: '0.65rem', color: '#c9a460', marginTop: '0.1rem' }}>5 stilist hazırdır →</div>
          </div>
        </div>
      </div>

      {/* Marquee strip */}
      <div style={{ background: 'rgba(8,3,1,0.55)', borderTop: '1px solid rgba(201,164,96,0.2)', padding: '0.65rem 0', overflow: 'hidden', position: 'relative', backdropFilter: 'blur(4px)' }}>
        <div style={{ display: 'flex', animation: 'marquee 22s linear infinite', width: 'max-content', gap: 0 }}>
          {['Saç Kəsimi', 'Manikür', 'Pedikür', 'Saç Boyası', 'Makeup', 'Qaş Laminasiyası', 'Üz Baxımı', 'Keratin', 'Gel-Lak', 'Ombre & Balayage', 'Saç Kəsimi', 'Manikür', 'Pedikür', 'Saç Boyası', 'Makeup', 'Qaş Laminasiyası', 'Üz Baxımı', 'Keratin', 'Gel-Lak', 'Ombre & Balayage'].map((t, i) => (
            <span key={i} style={{ fontSize: '0.7rem', color: 'rgba(201,164,96,0.8)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 2rem', whiteSpace: 'nowrap' }}>
              {t} <span style={{ color: 'rgba(201,164,96,0.35)', margin: '0 0.5rem' }}>✦</span>
            </span>
          ))}
        </div>
      </div>
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
            <div key={salon.id} role="article" className="salon-card" style={{ cursor: 'pointer' }} onClick={() => { window.location.href = `/salons/${salon.slug}`; }}>
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
                  onClick={(e) => e.stopPropagation()}
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
            </div>
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
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'white' }}>
      <Header isAuthenticated={isAuthenticated} />
      <main style={{ flex: 1 }}>
        <Hero />
        <Features />
        <PopularSalons salons={salons} />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
