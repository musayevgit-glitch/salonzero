'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader, PageFooter } from './PageLayout';
import { SalonCard } from './SalonCard';

interface SalonListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  genderFocus: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  categories: string[];
  startingPrice: { amount: number; currency: string } | null;
}

function ArrowRightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Debounced public salon search ──────────────────────── */
interface SearchState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  results: SalonListItem[];
}

/**
 * Auto-searching salon field. The public search API (`GET /api/public/salons`) matches on
 * salon name and city only — there is no stylist or service text index — so the copy
 * promises salons only. No submit button: results stream in after a 300 ms debounce.
 */
function HeroSearch() {
  const t = useTranslations('home');
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ status: 'idle', results: [] });
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (term: string, signal: AbortSignal) => {
    setState((prev) => ({ status: 'loading', results: prev.results }));
    try {
      const res = await fetch(
        `/api/public/salons?pageSize=5&sort=name_asc&search=${encodeURIComponent(term)}`,
        { signal },
      );
      if (!res.ok) throw new Error('search_failed');
      const data = (await res.json()) as { items: SalonListItem[] };
      setState({ status: 'ready', results: data.items ?? [] });
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return;
      setState({ status: 'error', results: [] });
    }
  }, []);

  useEffect(() => {
    const term = query.trim();
    abortRef.current?.abort();
    if (term.length < 2) {
      setState({ status: 'idle', results: [] });
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => void runSearch(term, controller.signal), 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, runSearch]);

  const showPanel = query.trim().length >= 2;

  return (
    <div className="hform" style={{ marginTop: '2rem', position: 'relative', maxWidth: 480 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 20, padding: '0.55rem 1.1rem', gap: '0.6rem', backdropFilter: 'blur(20px)', boxShadow: '0 4px 32px rgba(0,0,0,0.25)' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, color: '#a78bfa' }}>
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          name="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('heroSearchPlaceholder')}
          aria-label={t('heroSearchPlaceholder')}
          aria-describedby="hero-search-hint"
          autoComplete="off"
          style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: '0.9rem', height: 34 } as React.CSSProperties}
        />
      </div>
      <p id="hero-search-hint" style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'rgba(220,210,255,0.6)' }}>
        {t('searchHint')}
      </p>

      {showPanel ? (
        <div
          role="status"
          aria-live="polite"
          style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.35rem', background: 'white', borderRadius: 16, border: '1px solid #e4d4f4', boxShadow: '0 18px 48px rgba(10,4,30,0.35)', overflow: 'hidden', zIndex: 20 }}
        >
          {state.status === 'loading' && state.results.length === 0 ? (
            <p style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', color: '#7c6fa0' }}>{t('searchLoading')}</p>
          ) : null}

          {state.status === 'error' ? (
            <p style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', color: '#b91c1c' }}>{t('searchError')}</p>
          ) : null}

          {state.status === 'ready' && state.results.length === 0 ? (
            <p style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', color: '#7c6fa0' }}>{t('searchEmpty')}</p>
          ) : null}

          {state.results.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {state.results.map((salon) => (
                <li key={salon.id} style={{ borderBottom: '1px solid #f3e8ff' }}>
                  <a
                    href={`/salons/${salon.slug}`}
                    className="hero-search-item"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.7rem 1rem', textDecoration: 'none' }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1b2e' }}>{salon.name}</span>
                    {salon.city ? (
                      <span style={{ fontSize: '0.75rem', color: '#7c6fa0', flexShrink: 0 }}>{salon.city}</span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          {state.status === 'ready' && state.results.length > 0 ? (
            <a
              href={`/salons?search=${encodeURIComponent(query.trim())}`}
              className="hero-search-item"
              style={{ display: 'block', padding: '0.7rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: '#7c3aed', textDecoration: 'none' }}
            >
              {t('searchViewAll')}
            </a>
          ) : null}

          <style>{`
            .hero-search-item:hover { background: #faf5ff; }
            .hero-search-item:focus-visible { outline: 2px solid #7c3aed; outline-offset: -2px; }
          `}</style>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Hero ───────────────────────────────────────────────── */
const HERO_IMAGES = ['/images/salon-1.png', '/images/salon-2.png', '/images/salon-3.png'];

function Hero({ salonCount, serviceTerms }: { salonCount: number; serviceTerms: string[] }) {
  const t = useTranslations('home');

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
        @keyframes purplePulse {
          0%, 100% { opacity: 0.14; transform: scale(1); }
          50%       { opacity: 0.32; transform: scale(1.08); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50%       { opacity: 0.75; transform: scale(1); }
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
            #0a0514 0%,
            #1a0a38 12%,
            #2d1565 22%,
            #5b21b6 33%,
            #7c3aed 44%,
            #c4b5fd 50%,
            #7c3aed 56%,
            #5b21b6 67%,
            #2d1565 78%,
            #1a0a38 88%,
            #0a0514 100%
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
        .purple-line-anim { display: block; height: 3px; background: linear-gradient(90deg, #7c3aed, #c4b5fd, #7c3aed); border-radius: 2px; width: 0; animation: lineGrow 0.8s ease 0.6s forwards; }
        @media (max-width: 767px) {
          .hero-cols { flex-direction: column !important; }
          .hero-right { display: none !important; }
          .hero-left { max-width: 100% !important; }
          .hero-h1 { font-size: 2.4rem !important; }
        }
      `}</style>

      {/* Animated luxury purple gradient */}
      <div className="hero-satin" aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* Left scrim */}
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '60%', background: 'linear-gradient(90deg, rgba(10,4,30,0.75) 0%, rgba(10,4,30,0.42) 65%, transparent 100%)', pointerEvents: 'none' }} />

      {/* Top + bottom vignette */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,4,30,0.38) 0%, transparent 30%, transparent 70%, rgba(10,4,30,0.28) 100%)', pointerEvents: 'none' }} />

      {/* Purple sparkle dots */}
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
          background: '#a78bfa',
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
            <span className="hw hw1">{t('heroTitle')}</span>
          </h1>

          {/* Purple underline */}
          <span className="purple-line-anim" style={{ marginTop: '0.6rem', maxWidth: 260 }} />

          {/* Subtitle */}
          <p className="hw hw3" style={{ marginTop: '1.25rem', fontSize: '1rem', color: 'rgba(220,210,255,0.75)', lineHeight: 1.75, fontWeight: 400 }}>
            {t('heroSubtitle')}
          </p>

          {/* Search — auto-searches, no submit button */}
          <HeroSearch />
        </div>

        {/* ── RIGHT — image collage ── */}
        <div className="hero-right" style={{ flex: 1, position: 'relative', minHeight: 480, display: 'flex' }}>

          {/* Background glow behind images */}
          <div aria-hidden="true" style={{ position: 'absolute', top: '15%', left: '10%', width: '70%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)', animation: 'purplePulse 6s ease-in-out infinite', pointerEvents: 'none' }} />

          {/* Image 1 — large, top */}
          <div className="himg1" style={{ position: 'absolute', top: 0, left: '5%', width: '58%', height: 280, borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(167,139,250,0.25)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <img src={HERO_IMAGES[0]} alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(10,4,30,0.4) 100%)' }} />
          </div>

          {/* Image 2 — smaller, top-right */}
          <div className="himg2" style={{ position: 'absolute', top: 20, right: 0, width: '38%', height: 190, borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(167,139,250,0.2)', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
            <img src={HERO_IMAGES[1]} alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>

          {/* Image 3 — bottom-right */}
          <div className="himg3" style={{ position: 'absolute', bottom: 0, right: '5%', width: '50%', height: 200, borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(167,139,250,0.2)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
            <img src={HERO_IMAGES[2]} alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, rgba(10,4,30,0.35) 100%)' }} />
          </div>

          {/* Live platform stat — real salon count from the public API, no mock data */}
          <div className="hbadge" style={{ position: 'absolute', bottom: 18, left: '2%', background: 'rgba(10,4,30,0.9)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: '0.7rem 1rem', border: '1px solid rgba(167,139,250,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 140 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{t('statsLabel')}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'white', fontWeight: 700 }}>{t('statsSalons', { count: salonCount })}</div>
            <a href="/salons" style={{ fontSize: '0.65rem', color: '#a78bfa', marginTop: '0.1rem', display: 'inline-block', textDecoration: 'none' }}>{t('statsCta')} →</a>
          </div>
        </div>
      </div>

      {/* Marquee strip — real service categories only. Rendered only when the API returned some,
          so the platform never advertises services no salon actually offers. */}
      {serviceTerms.length > 0 ? (
        <div style={{ background: 'rgba(10,4,30,0.55)', borderTop: '1px solid rgba(167,139,250,0.2)', padding: '0.65rem 0', overflow: 'hidden', position: 'relative', backdropFilter: 'blur(4px)' }}>
          <div style={{ display: 'flex', animation: 'marquee 22s linear infinite', width: 'max-content', gap: 0 }} aria-hidden="true">
            {[...serviceTerms, ...serviceTerms].map((term, i) => (
              <span key={`${term}-${i}`} style={{ fontSize: '0.7rem', color: 'rgba(167,139,250,0.82)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 2rem', whiteSpace: 'nowrap' }}>
                {term} <span style={{ color: 'rgba(167,139,250,0.38)', margin: '0 0.5rem' }}>✦</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ─── Features row ───────────────────────────────────────── */
function Features() {
  const t = useTranslations('home');
  const features = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="14" height="13" rx="2" stroke="#7c3aed" strokeWidth="1.4" />
          <path d="M7 2v4M13 2v4M3 9h14" stroke="#7c3aed" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
      title: t('featEasyBooking'),
      desc: t('featEasyBookingDesc'),
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2l1.5 4.5H16l-3.75 2.7 1.43 4.4L10 11.1l-3.68 2.6 1.43-4.4L4 6.5h4.5L10 2z" stroke="#7c3aed" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      ),
      title: t('featVerifiedStylists'),
      desc: t('featVerifiedStylistsDesc'),
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2l1.3 3.9 4.1.3-3.1 2.7 1 4-3.3-2-3.3 2 1-4-3.1-2.7 4.1-.3L10 2z" stroke="#7c3aed" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      ),
      title: t('featQuality'),
      desc: t('featQualityDesc'),
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 3a5 5 0 0 1 5 5c0 3.5-5 9-5 9s-5-5.5-5-9a5 5 0 0 1 5-5z" stroke="#7c3aed" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M7 9a3 3 0 0 1 6 0" stroke="#7c3aed" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
      title: t('featNotification'),
      desc: t('featNotificationDesc'),
    },
  ];

  return (
    <section style={{ background: 'white', borderTop: '1px solid #e4d4f4', borderBottom: '1px solid #e4d4f4' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem 1.25rem' }} className="grid grid-cols-2 md:grid-cols-4">
        {features.map((f, i) => (
          <div key={i} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e1b2e' }}>{f.title}</p>
            <p style={{ fontSize: '0.72rem', color: '#7c6fa0', lineHeight: 1.5 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Popular salons ─────────────────────────────────────── */
function PopularSalons({ salons }: { salons: SalonListItem[] }) {
  const t = useTranslations('home');
  const ts = useTranslations('salons');
  const tc = useTranslations('common');

  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '2.5rem 1.25rem' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem' }}>
        <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e1b2e' }}>
          {t('popularSalons')}
        </h2>
        <a href="/salons" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
          {tc('viewAll')} <ArrowRightIcon size={13} />
        </a>
      </div>

      {salons.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#7c6fa0', fontSize: '0.95rem' }}>
          {ts('empty')}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {salons.slice(0, 6).map((salon) => (
            <SalonCard key={salon.id} salon={salon} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── CTA dark section ───────────────────────────────────── */
function CTASection() {
  const t = useTranslations('home');
  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.25rem 3rem' }}>
      <div style={{ borderRadius: '24px', overflow: 'hidden', position: 'relative', background: '#130d2e', padding: '2.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Subtle purple glow overlay */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 70% 50%, rgba(124,58,237,0.25) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.18, overflow: 'hidden' }}>
          <img src="/images/cta-bg.png" alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center right' }} />
        </div>

        <div style={{ position: 'relative', maxWidth: 400 }}>
          <div style={{ color: '#a78bfa', marginBottom: '0.75rem', fontSize: '1.2rem' }}>✦</div>
          <h2 className="font-display" style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 700, color: 'white', lineHeight: 1.2, marginBottom: '0.75rem' }}>
            {t('ctaTitle')}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'rgba(220,210,255,0.72)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {t('ctaSubtitle')}
          </p>
          <a
            href="/salons"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', borderRadius: '14px', background: '#7c3aed', color: 'white', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none', transition: 'opacity 0.15s', boxShadow: '0 4px 20px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.88'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
          >
            {t('ctaButton')} <ArrowRightIcon size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─── Main export ────────────────────────────────────────── */
export function LandingPage({
  isAuthenticated,
  salons,
  salonCount,
}: {
  isAuthenticated: boolean;
  salons: SalonListItem[];
  /** Total number of ACTIVE salons, as reported by the public salons API. */
  salonCount: number;
}) {
  // Distinct, real service-category names across the salons the API returned.
  const serviceTerms = [...new Set(salons.flatMap((s) => s.categories ?? []))]
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .slice(0, 12);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'white' }}>
      <PageHeader isAuthenticated={isAuthenticated} />
      <main style={{ flex: 1 }}>
        <Hero salonCount={salonCount} serviceTerms={serviceTerms} />
        <Features />
        <PopularSalons salons={salons} />
        <CTASection />
      </main>
      <PageFooter />
    </div>
  );
}
