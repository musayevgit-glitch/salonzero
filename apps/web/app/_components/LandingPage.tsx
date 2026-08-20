'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader, PageFooter } from './PageLayout';
import { SalonCard } from './SalonCard';
import { getInitials } from '../../lib/initials';
import { resolveSalonCoverUrl, resolveSalonLogoUrl } from '../../lib/salon-images';

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
  /** Real mean of customer ratings; null until this salon has been rated at least once. */
  avgRating: number | null;
  ratingCount: number;
}

function ArrowRightIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2.5 7h9M8 3.5 11.5 7 8 10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
    <div style={{ marginTop: '1.75rem', position: 'relative', maxWidth: 460 }}>
      <div className="sz-hero-search">
        <svg
          width="17"
          height="17"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          style={{ flexShrink: 0, color: '#6A5ACD' }}
        >
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
        />
      </div>
      <p
        id="hero-search-hint"
        style={{ marginTop: '0.5rem', fontSize: '0.74rem', color: '#8b7fae' }}
      >
        {t('searchHint')}
      </p>

      {showPanel ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            top: 'calc(100% - 1.4rem)',
            left: 0,
            right: 0,
            marginTop: '0.35rem',
            background: 'white',
            borderRadius: 16,
            border: '1px solid #e4d4f4',
            boxShadow: '0 18px 48px rgba(30,27,46,0.16)',
            overflow: 'hidden',
            zIndex: 20,
          }}
        >
          {state.status === 'loading' && state.results.length === 0 ? (
            <p style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', color: '#7c6fa0' }}>
              {t('searchLoading')}
            </p>
          ) : null}

          {state.status === 'error' ? (
            <p style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', color: '#b91c1c' }}>
              {t('searchError')}
            </p>
          ) : null}

          {state.status === 'ready' && state.results.length === 0 ? (
            <p style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', color: '#7c6fa0' }}>
              {t('searchEmpty')}
            </p>
          ) : null}

          {state.results.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {state.results.map((salon) => (
                <li key={salon.id} style={{ borderBottom: '1px solid #f3e8ff' }}>
                  <a
                    href={`/salons/${salon.slug}`}
                    className="hero-search-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.7rem 1rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1b2e' }}>
                      {salon.name}
                    </span>
                    {salon.city ? (
                      <span style={{ fontSize: '0.75rem', color: '#7c6fa0', flexShrink: 0 }}>
                        {salon.city}
                      </span>
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
              style={{
                display: 'block',
                padding: '0.7rem 1rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#6A5ACD',
                textDecoration: 'none',
              }}
            >
              {t('searchViewAll')}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ─── Hero visual: overlapping real salon cards ──────────── */
function HeroCollage({ salons }: { salons: SalonListItem[] }) {
  const tr = useTranslations('ratings');
  // Only real salons are shown. With nothing to show, the collage is skipped entirely
  // rather than faking a marketplace that has no listings yet.
  const picks = salons.slice(0, 3);
  if (picks.length === 0) return null;

  const OFFSETS = [
    { top: 0, left: '4%', rotate: '-3deg', z: 3 },
    { top: 92, left: '26%', rotate: '2.5deg', z: 2 },
    { top: 190, left: '10%', rotate: '-1.5deg', z: 1 },
  ];

  return (
    <div className="sz-collage" aria-hidden="true">
      <span className="sz-collage-glow" />
      {picks.map((salon, i) => {
        const o = OFFSETS[i]!;
        const logo = resolveSalonLogoUrl(salon.logoUrl);
        const hasRating = typeof salon.avgRating === 'number' && salon.ratingCount > 0;
        return (
          <div
            key={salon.id}
            className="sz-collage-card"
            style={{ top: o.top, left: o.left, transform: `rotate(${o.rotate})`, zIndex: o.z }}
          >
            <img src={resolveSalonCoverUrl(salon.coverUrl)} alt="" loading="lazy" />
            <div className="sz-collage-meta">
              {logo ? (
                <img className="sz-collage-logo" src={logo} alt="" loading="lazy" />
              ) : (
                <span className="sz-collage-logo sz-collage-logo-fb">
                  {getInitials(salon.name)}
                </span>
              )}
              <div style={{ minWidth: 0 }}>
                <p className="sz-collage-name">{salon.name}</p>
                <p className="sz-collage-sub">
                  {hasRating
                    ? tr('ratingWithCount', {
                        rating: (salon.avgRating as number).toFixed(1),
                        count: salon.ratingCount,
                      })
                    : (salon.city ?? '')}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Hero ───────────────────────────────────────────────── */
function Hero({ salons }: { salons: SalonListItem[] }) {
  const t = useTranslations('home');

  return (
    <section className="sz-hero">
      <div className="sz-hero-inner">
        <div className="sz-hero-copy">
          <h1 className="sz-hero-title">{t('heroTitle2')}</h1>
          <p className="sz-hero-sub">{t('heroSubtitle')}</p>
          <HeroSearch />
          <div className="sz-hero-ctas">
            <a href="/salons" className="sz-btn-primary">
              {t('heroCtaPrimary')}
              <ArrowRightIcon />
            </a>
            <a href="/stilistler" className="sz-btn-ghost">
              {t('heroCtaSecondary')}
            </a>
          </div>
        </div>

        <div className="sz-hero-visual">
          <HeroCollage salons={salons} />
        </div>
      </div>
    </section>
  );
}

/* ─── How it works ───────────────────────────────────────── */
function HowItWorks() {
  const t = useTranslations('home');

  const steps = [
    {
      title: t('step1Title'),
      desc: t('step1Desc'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="6" cy="18" r="2.6" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8.2 7.6 20 18M8.2 16.4 20 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      title: t('step2Title'),
      desc: t('step2Desc'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 2.5v4M16 2.5v4M3 10h18"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      title: t('step3Title'),
      desc: t('step3Desc'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="m8 12.4 2.7 2.7L16.2 9.6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <section className="sz-section">
      <h2 className="sz-h2">{t('howItWorksTitle')}</h2>
      <ol className="sz-steps">
        {steps.map((s, i) => (
          <li key={s.title} className="sz-step">
            <span className="sz-step-icon">{s.icon}</span>
            <span className="sz-step-num">{i + 1}</span>
            <h3 className="sz-step-title">{s.title}</h3>
            <p className="sz-step-desc">{s.desc}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ─── Popular salons ─────────────────────────────────────── */
function PopularSalons({ salons }: { salons: SalonListItem[] }) {
  const t = useTranslations('home');
  const ts = useTranslations('salons');
  const tc = useTranslations('common');

  return (
    <section className="sz-section">
      <div className="sz-section-head">
        <h2 className="sz-h2" style={{ margin: 0 }}>
          {t('popularSalons')}
        </h2>
        <a href="/salons" className="sz-link-arrow">
          {tc('viewAll')} <ArrowRightIcon size={13} />
        </a>
      </div>

      {salons.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#7c6fa0' }}>
          {ts('empty')}
        </p>
      ) : (
        <div className="sz-salon-grid">
          {salons.slice(0, 6).map((salon) => (
            <SalonCard key={salon.id} salon={salon} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Why Salonomia — 4 benefit tiles ────────────────────── */
function WhySalonomia() {
  const t = useTranslations('home');
  const benefits = [
    {
      title: t('featEasyBooking'),
      desc: t('featEasyBookingDesc'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect
            x="3"
            y="4"
            width="14"
            height="13"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M7 2v4M13 2v4M3 9h14"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      title: t('featVerifiedStylists'),
      desc: t('featVerifiedStylistsDesc'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M3.5 17c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      title: t('featQuality'),
      desc: t('featQualityDesc'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M10 2l2 4.1 4.5.65-3.25 3.15.77 4.5L10 12.3l-4.02 2.1.77-4.5L3.5 6.75 8 6.1 10 2z"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      title: t('featNotification'),
      desc: t('featNotificationDesc'),
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M5 8a5 5 0 0 1 10 0c0 3.2 1 4.5 1 4.5H4S5 11.2 5 8z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M8.2 15a1.9 1.9 0 0 0 3.6 0"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  return (
    <section className="sz-section">
      <h2 className="sz-h2">{t('whyTitle')}</h2>
      <div className="sz-benefits">
        {benefits.map((b) => (
          <div key={b.title} className="sz-benefit">
            <span className="sz-benefit-icon">{b.icon}</span>
            <div style={{ minWidth: 0 }}>
              <h3 className="sz-benefit-title">{b.title}</h3>
              <p className="sz-benefit-desc">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Closing CTA ────────────────────────────────────────── */
function CTASection() {
  const t = useTranslations('home');
  return (
    <section className="sz-section">
      <div className="sz-cta-band">
        <div style={{ position: 'relative', maxWidth: 460 }}>
          <h2 className="sz-cta-title">{t('ctaTitle')}</h2>
          <p className="sz-cta-sub">{t('ctaSubtitle')}</p>
        </div>
        <a href="/salons" className="sz-cta-btn">
          {t('ctaButton')} <ArrowRightIcon size={14} />
        </a>
      </div>
    </section>
  );
}

/* ─── Main export ────────────────────────────────────────── */
export function LandingPage({
  isAuthenticated,
  salons,
}: {
  isAuthenticated: boolean;
  salons: SalonListItem[];
  /** Total number of ACTIVE salons, as reported by the public salons API. */
  salonCount?: number;
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
      <PageHeader isAuthenticated={isAuthenticated} />
      <main style={{ flex: 1 }}>
        <Hero salons={salons} />
        <HowItWorks />
        <PopularSalons salons={salons} />
        <WhySalonomia />
        <CTASection />
      </main>
      <PageFooter />

      <style>{`
        /* ── Hero ─────────────────────────────────────────── */
        .sz-hero {
          background: linear-gradient(135deg, #faf7ff 0%, #f0ebff 50%, #faf7ff 100%);
          border-bottom: 1px solid #f0e8f5;
          overflow: hidden;
        }
        .sz-hero-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 3rem 1.25rem 3.5rem;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
        }
        .sz-hero-copy { min-width: 0; max-width: 620px; }
        .sz-hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(2.1rem, 6vw, 3.4rem);
          line-height: 1.1;
          font-weight: 700;
          color: #1e1b2e;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .sz-hero-sub {
          margin: 1rem 0 0;
          font-size: 1.02rem;
          line-height: 1.6;
          color: #7c6fa0;
          max-width: 46ch;
        }
        .sz-hero-search {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          background: #fff;
          border: 1px solid #e4d4f4;
          border-radius: 14px;
          padding: 0.55rem 1rem;
          box-shadow: 0 1px 4px rgba(30,27,46,0.06);
        }
        .sz-hero-search:focus-within { border-color: #6A5ACD; box-shadow: 0 0 0 3px rgba(106,90,205,0.18); }
        .sz-hero-search input {
          flex: 1;
          min-width: 0;
          height: 34px;
          border: none;
          outline: none;
          background: none;
          font-family: inherit;
          font-size: 0.92rem;
          color: #1e1b2e;
        }
        .hero-search-item:hover { background: #faf5ff; }
        .hero-search-item:focus-visible { outline: 2px solid #7c3aed; outline-offset: -2px; }
        .sz-hero-ctas { display: flex; flex-wrap: wrap; gap: 0.7rem; margin-top: 1.4rem; }
        .sz-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.8rem 1.6rem;
          border-radius: 12px;
          background: #6A5ACD;
          color: #fff;
          font-weight: 700;
          font-size: 0.92rem;
          text-decoration: none;
          box-shadow: 0 8px 22px rgba(106,90,205,0.30);
          transition: background 0.15s, transform 0.15s;
        }
        .sz-btn-primary:hover { background: #5c4cbe; transform: translateY(-1px); }
        .sz-btn-ghost {
          display: inline-flex;
          align-items: center;
          padding: 0.8rem 1.6rem;
          border-radius: 12px;
          background: #fff;
          border: 1px solid #e4d4f4;
          color: #4a3f6b;
          font-weight: 600;
          font-size: 0.92rem;
          text-decoration: none;
          transition: background 0.15s, border-color 0.15s;
        }
        .sz-btn-ghost:hover { background: #f3e8ff; border-color: #c4b5fd; }
        .sz-btn-primary:focus-visible, .sz-btn-ghost:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }

        .sz-hero-visual { display: none; }
        .sz-collage { position: relative; width: 100%; height: 400px; }
        .sz-collage-glow {
          position: absolute;
          inset: 8% 5%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%);
        }
        .sz-collage-card {
          position: absolute;
          width: 62%;
          max-width: 300px;
          background: #fff;
          border: 1px solid #e4d4f4;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 16px 40px rgba(30,27,46,0.14);
        }
        .sz-collage-card img { width: 100%; height: 120px; object-fit: cover; display: block; }
        .sz-collage-meta { display: flex; align-items: center; gap: 0.55rem; padding: 0.65rem 0.8rem; min-width: 0; }
        .sz-collage-logo {
          width: 30px; height: 30px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
          border: 2px solid #fff; box-shadow: 0 1px 4px rgba(30,27,46,0.2);
        }
        .sz-collage-logo-fb {
          display: flex; align-items: center; justify-content: center;
          background: #6A5ACD; color: #fff; font-size: 0.68rem; font-weight: 700;
        }
        .sz-collage-name {
          margin: 0; font-size: 0.82rem; font-weight: 700; color: #1e1b2e;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .sz-collage-sub { margin: 0; font-size: 0.72rem; color: #7c6fa0; }

        /* ── Sections ─────────────────────────────────────── */
        .sz-section { max-width: 1280px; margin: 0 auto; padding: 3rem 1.25rem 0; }
        .sz-section:last-of-type { padding-bottom: 3.5rem; }
        .sz-h2 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(1.4rem, 3vw, 1.85rem);
          font-weight: 700;
          color: #1e1b2e;
          margin: 0 0 1.5rem;
        }
        .sz-section-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem;
        }
        .sz-link-arrow {
          display: inline-flex; align-items: center; gap: 0.35rem;
          font-size: 0.85rem; font-weight: 600; color: #6A5ACD; text-decoration: none;
        }
        .sz-link-arrow:hover { text-decoration: underline; }
        .sz-link-arrow:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; border-radius: 4px; }

        .sz-steps {
          list-style: none; margin: 0; padding: 0;
          display: grid; grid-template-columns: 1fr; gap: 1rem;
          counter-reset: step;
        }
        .sz-step {
          position: relative;
          background: #fff;
          border: 1px solid #e4d4f4;
          border-radius: 16px;
          padding: 1.5rem 1.35rem;
          box-shadow: 0 1px 4px rgba(30,27,46,0.06);
        }
        .sz-step-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 44px; height: 44px; border-radius: 12px;
          background: rgba(106,90,205,0.10); color: #6A5ACD;
        }
        .sz-step-num {
          position: absolute; top: 1.5rem; right: 1.35rem;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.6rem; font-weight: 700; color: #ede4f8; line-height: 1;
        }
        .sz-step-title { margin: 0.9rem 0 0.3rem; font-size: 1rem; font-weight: 700; color: #1e1b2e; }
        .sz-step-desc { margin: 0; font-size: 0.86rem; line-height: 1.55; color: #7c6fa0; }

        .sz-salon-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }

        .sz-benefits { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        .sz-benefit {
          display: flex; align-items: flex-start; gap: 0.9rem;
          background: #fff; border: 1px solid #e4d4f4; border-radius: 16px;
          padding: 1.25rem; box-shadow: 0 1px 4px rgba(30,27,46,0.06);
        }
        .sz-benefit-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
          background: rgba(106,90,205,0.10); color: #6A5ACD;
        }
        .sz-benefit-title { margin: 0 0 0.25rem; font-size: 0.95rem; font-weight: 700; color: #1e1b2e; }
        .sz-benefit-desc { margin: 0; font-size: 0.84rem; line-height: 1.55; color: #7c6fa0; }

        .sz-cta-band {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          background: linear-gradient(135deg, #1e1b2e 0%, #2d1565 55%, #4c1d95 100%);
          padding: 2.5rem 1.75rem;
          display: flex; flex-direction: column; align-items: flex-start; gap: 1.5rem;
        }
        .sz-cta-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(1.35rem, 3vw, 1.9rem);
          font-weight: 700; color: #fff; line-height: 1.2; margin: 0 0 0.6rem;
        }
        .sz-cta-sub { margin: 0; font-size: 0.9rem; line-height: 1.6; color: rgba(220,210,255,0.78); }
        .sz-cta-btn {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.8rem 1.6rem; border-radius: 12px;
          background: #fff; color: #4c1d95; font-weight: 700; font-size: 0.9rem;
          text-decoration: none; flex-shrink: 0;
        }
        .sz-cta-btn:hover { background: #ede4f8; }
        .sz-cta-btn:focus-visible { outline: 2px solid #a78bfa; outline-offset: 3px; }

        @media (min-width: 640px) {
          .sz-salon-grid { grid-template-columns: repeat(2, 1fr); }
          .sz-benefits { grid-template-columns: repeat(2, 1fr); }
          .sz-steps { grid-template-columns: repeat(3, 1fr); }
          .sz-cta-band { flex-direction: row; align-items: center; justify-content: space-between; padding: 2.75rem 2.25rem; }
        }
        @media (min-width: 1024px) {
          .sz-salon-grid { grid-template-columns: repeat(3, 1fr); }
          .sz-hero-inner { flex-direction: row; align-items: center; gap: 3rem; padding: 4.5rem 1.25rem 5rem; }
          .sz-hero-copy { flex: 0 0 52%; }
          .sz-hero-visual { display: block; flex: 1; min-width: 0; }
        }
      `}</style>
    </div>
  );
}
