'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
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

function StarIcon({ size = 12, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M6 1l1.2 2.5 2.7.4-1.95 1.9.46 2.7L6 7.25 3.59 8.5l.46-2.7L2.1 3.9l2.7-.4L6 1z"
        fill={filled ? '#f59e0b' : 'none'}
        stroke={filled ? '#f59e0b' : '#d1d5db'}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Hero search bar ─────────────────────────────────────── */
function HeroSearchBar() {
  const [service, setService] = useState('');
  const [date, setDate] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (service.trim()) params.set('search', service.trim());
    if (date) params.set('date', date);
    window.location.href = `/salons${params.toString() ? '?' + params.toString() : ''}`;
  }

  return (
    <div className="sz-searchbar-wrap">
      <form className="sz-searchbar" onSubmit={handleSearch} role="search" aria-label="Salon axtar">
        {/* Zone 1: Location */}
        <div className="sz-searchbar-zone">
          <span className="sz-searchbar-label">Lokasiya</span>
          <span className="sz-searchbar-val">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ color: '#7c3aed' }}>
              <path d="M7 1.5C5.07 1.5 3.5 3.07 3.5 5c0 2.63 3.5 7 3.5 7s3.5-4.37 3.5-7c0-1.93-1.57-3.5-3.5-3.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <circle cx="7" cy="5" r="1.1" fill="currentColor" />
            </svg>
            Bakı
          </span>
        </div>

        <div className="sz-searchbar-divider" aria-hidden="true" />

        {/* Zone 2: Service */}
        <div className="sz-searchbar-zone sz-searchbar-zone--input">
          <label className="sz-searchbar-label" htmlFor="hero-service-input">Xidmət</label>
          <input
            id="hero-service-input"
            type="text"
            className="sz-searchbar-input"
            placeholder="Saç, dırnaq, üz..."
            value={service}
            onChange={(e) => setService(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="sz-searchbar-divider" aria-hidden="true" />

        {/* Zone 3: Date */}
        <div className="sz-searchbar-zone sz-searchbar-zone--input">
          <label className="sz-searchbar-label" htmlFor="hero-date-input">Tarix</label>
          <input
            id="hero-date-input"
            type="date"
            className="sz-searchbar-input sz-searchbar-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Search button */}
        <button type="submit" className="sz-searchbar-btn" aria-label="Axtar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span>Axtar</span>
        </button>
      </form>
    </div>
  );
}

/* ─── Floating salon card ─────────────────────────────────── */
function FloatingSalonCard({ salon }: { salon: SalonListItem }) {
  const logo = resolveSalonLogoUrl(salon.logoUrl);
  const cover = resolveSalonCoverUrl(salon.coverUrl);
  const hasRating = typeof salon.avgRating === 'number' && salon.ratingCount > 0;

  return (
    <div className="sz-float-card sz-float-card--salon" aria-hidden="true">
      <img src={cover} alt="" className="sz-float-card-cover" loading="lazy" />
      <div className="sz-float-card-body">
        {logo ? (
          <img src={logo} alt="" className="sz-float-card-logo" loading="lazy" />
        ) : (
          <span className="sz-float-card-logo sz-float-card-logo-fb">{getInitials(salon.name)}</span>
        )}
        <div style={{ minWidth: 0 }}>
          <p className="sz-float-card-name">{salon.name}</p>
          <p className="sz-float-card-sub">
            {salon.city ?? 'Bakı'}
            {hasRating ? (
              <span className="sz-float-card-rating">
                <StarIcon size={10} />
                {(salon.avgRating as number).toFixed(1)}
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Floating trust card ─────────────────────────────────── */
function FloatingTrustCard() {
  return (
    <div className="sz-float-card sz-float-card--trust" aria-hidden="true">
      <div className="sz-float-trust-avatars">
        {['#c4b5fd', '#a78bfa', '#7c3aed'].map((bg, i) => (
          <span key={i} className="sz-float-trust-avatar" style={{ background: bg, marginLeft: i === 0 ? 0 : -8 }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="5" r="2.5" fill="white" opacity="0.9" />
              <path d="M2 12.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="white" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
            </svg>
          </span>
        ))}
      </div>
      <div>
        <div className="sz-float-trust-stars">
          {[1, 2, 3, 4, 5].map((s) => <StarIcon key={s} size={11} />)}
        </div>
        <p className="sz-float-trust-label">Məmnun müştərilər</p>
      </div>
    </div>
  );
}

/* ─── Floating services card ──────────────────────────────── */
const POPULAR_SERVICES = [
  { name: 'Saç düzümü', price: '15 ₼' },
  { name: 'Manikür', price: '10 ₼' },
  { name: 'Saç rəngi', price: '25 ₼' },
];

function FloatingServicesCard() {
  return (
    <div className="sz-float-card sz-float-card--services" aria-hidden="true">
      <p className="sz-float-services-title">Populyar Xidmətlər</p>
      <ul className="sz-float-services-list">
        {POPULAR_SERVICES.map((svc) => (
          <li key={svc.name} className="sz-float-services-item">
            <span>{svc.name}</span>
            <span className="sz-float-services-price">{svc.price}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Stats strip ─────────────────────────────────────────── */
function StatsStrip({ salonCount }: { salonCount: number }) {
  const stats = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="2" y="5" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6 5V3.5a2 2 0 0 1 4 0V5M14 5V3.5a2 2 0 0 1 0 4V5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M2 9h16" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      ),
      value: salonCount > 0 ? `${salonCount}+` : null,
      label: 'Aktiv salon',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3.5 17c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
      value: null,
      label: 'Peşəkar stilistlər',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 2l2 4.1 4.5.65-3.25 3.15.77 4.5L10 12.3l-4.02 2.1.77-4.5L3.5 6.75 8 6.1 10 2z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
        </svg>
      ),
      value: null,
      label: 'Yüksək reytinq',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="14" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M7 2v4M13 2v4M3 9h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
      value: null,
      label: 'Asan rezervasiya',
    },
  ];

  return (
    <div className="sz-stats-strip">
      <div className="sz-stats-inner">
        {stats.map((stat, i) => (
          <div key={i} className="sz-stat">
            <span className="sz-stat-icon">{stat.icon}</span>
            <div>
              {stat.value ? <p className="sz-stat-value">{stat.value}</p> : null}
              <p className="sz-stat-label" style={stat.value ? {} : { fontWeight: 700, color: '#1e1b2e' }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Hero ───────────────────────────────────────────────── */
function Hero({ salons, salonCount }: { salons: SalonListItem[]; salonCount: number }) {
  const featuredSalon = salons.length > 0 ? salons[0] : null;

  return (
    <section className="sz-hero2">
      <div className="sz-hero2-inner">
        {/* Left column */}
        <div className="sz-hero2-copy">
          {/* Badge */}
          <div className="sz-hero2-badge" aria-label="Salon rezervasiyası daha asan">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M7 1l1.5 3.1 3.4.5-2.45 2.4.58 3.4L7 9l-3.03 1.4.58-3.4L2.1 4.6l3.4-.5L7 1z"
                fill="#7c3aed"
                stroke="#7c3aed"
                strokeWidth="0.5"
                strokeLinejoin="round"
              />
            </svg>
            <span>Salon rezervasiyası daha asan</span>
          </div>

          {/* Headline */}
          <h1 className="sz-hero2-title">
            <span className="sz-hero2-title-dark">Gözəllik üçün</span>
            <br />
            <span className="sz-hero2-title-grad">ən doğru ünvan</span>
          </h1>

          {/* Description */}
          <p className="sz-hero2-desc">
            Sevdiyin salonu seç, uyğun xidmətləri kəşf et və bir neçə kliklə rezervasiyanı tamamla.
          </p>

          {/* CTAs */}
          <div className="sz-hero2-ctas">
            <a href="/salons" className="sz-btn2-primary">
              Salonları Kəşf Et
              <ArrowRightIcon size={15} />
            </a>
            <a href="#how-it-works" className="sz-btn2-ghost">
              <span className="sz-btn2-play" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M4 2.5l5.5 3.5L4 9.5V2.5z" fill="currentColor" />
                </svg>
              </span>
              Necə işləyir?
            </a>
          </div>
        </div>

        {/* Right column: image + blob + floating cards */}
        <div className="sz-hero2-visual" aria-hidden="true">
          {/* Blob shape */}
          <div className="sz-hero2-blob" />

          {/* Hero image */}
          <div className="sz-hero2-imgwrap">
            <Image
              src="/images/hero-woman.png"
              alt="Gözəllik salonu"
              width={480}
              height={540}
              className="sz-hero2-img"
              priority
            />
          </div>

          {/* Floating card: trust */}
          <FloatingTrustCard />

          {/* Floating card: salon (if we have real data) */}
          {featuredSalon ? <FloatingSalonCard salon={featuredSalon} /> : null}

          {/* Floating card: popular services */}
          <FloatingServicesCard />
        </div>
      </div>

      {/* Overlapping search bar */}
      <HeroSearchBar />

      <style>{`
        /* ── Hero2 ─────────────────────────────────────────── */
        .sz-hero2 {
          background: linear-gradient(160deg, #fdfcff 0%, #f5f0ff 60%, #fdfcff 100%);
          border-bottom: 1px solid #ede9fe;
          overflow: visible;
          position: relative;
          padding-bottom: 5rem;
        }
        .sz-hero2-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 4rem 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 3rem;
          align-items: center;
        }
        /* ── Left copy ─── */
        .sz-hero2-copy {
          flex: 0 0 50%;
          min-width: 0;
          max-width: 580px;
        }
        .sz-hero2-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: #f3e8ff;
          border: 1px solid #e9d5ff;
          border-radius: 999px;
          padding: 0.35rem 0.85rem;
          font-size: 0.78rem;
          font-weight: 600;
          color: #7c3aed;
          margin-bottom: 1.25rem;
        }
        .sz-hero2-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(2.4rem, 6vw, 3.8rem);
          line-height: 1.08;
          font-weight: 700;
          margin: 0 0 1.1rem;
          letter-spacing: -0.02em;
        }
        .sz-hero2-title-dark { color: #1e1b2e; }
        .sz-hero2-title-grad {
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .sz-hero2-desc {
          margin: 0 0 1.75rem;
          font-size: 1.02rem;
          line-height: 1.65;
          color: #6b7280;
          max-width: 44ch;
        }
        .sz-hero2-ctas {
          display: flex;
          flex-wrap: wrap;
          gap: 0.85rem;
          align-items: center;
        }
        .sz-btn2-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.85rem 1.75rem;
          border-radius: 14px;
          background: #7c3aed;
          color: #fff;
          font-weight: 700;
          font-size: 0.95rem;
          text-decoration: none;
          box-shadow: 0 8px 24px rgba(124,58,237,0.35);
          transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
        }
        .sz-btn2-primary:hover { background: #6d28d9; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(124,58,237,0.4); }
        .sz-btn2-primary:focus-visible { outline: 2px solid #7c3aed; outline-offset: 3px; }
        .sz-btn2-ghost {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.85rem 1.5rem;
          border-radius: 14px;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          color: #374151;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .sz-btn2-ghost:hover { border-color: #c4b5fd; background: #faf5ff; color: #7c3aed; }
        .sz-btn2-ghost:focus-visible { outline: 2px solid #7c3aed; outline-offset: 3px; }
        .sz-btn2-play {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #f3e8ff;
          color: #7c3aed;
          flex-shrink: 0;
        }

        /* ── Right visual ── */
        .sz-hero2-visual { display: none; }
        .sz-hero2-blob {
          position: absolute;
          inset: -5% 0 5% 10%;
          border-radius: 60% 40% 70% 30% / 50% 60% 40% 50%;
          background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
          z-index: 0;
        }
        .sz-hero2-imgwrap {
          position: relative;
          z-index: 2;
          border-radius: 32px;
          overflow: hidden;
          box-shadow: 0 32px 64px rgba(30,27,46,0.18);
          width: 100%;
          max-width: 380px;
          margin: 0 auto;
        }
        .sz-hero2-img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: cover;
        }

        /* ── Floating cards ── */
        .sz-float-card {
          position: absolute;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 12px 36px rgba(30,27,46,0.14);
          border: 1px solid rgba(229,231,235,0.8);
          z-index: 10;
          padding: 0.75rem 1rem;
          min-width: 160px;
        }
        .sz-float-card--salon {
          bottom: 8%;
          left: -8%;
          min-width: 200px;
        }
        .sz-float-card--trust {
          top: 8%;
          right: -5%;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .sz-float-card--services {
          top: 45%;
          right: -12%;
          min-width: 170px;
        }
        .sz-float-card-cover {
          width: 100%;
          height: 70px;
          object-fit: cover;
          border-radius: 10px;
          display: block;
          margin-bottom: 0.5rem;
        }
        .sz-float-card-body {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .sz-float-card-logo {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(30,27,46,0.2);
        }
        .sz-float-card-logo-fb {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #7c3aed;
          color: #fff;
          font-size: 0.62rem;
          font-weight: 700;
        }
        .sz-float-card-name {
          margin: 0;
          font-size: 0.78rem;
          font-weight: 700;
          color: #1e1b2e;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 130px;
        }
        .sz-float-card-sub {
          margin: 0;
          font-size: 0.68rem;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .sz-float-card-rating {
          display: inline-flex;
          align-items: center;
          gap: 0.15rem;
          color: #f59e0b;
          margin-left: 0.25rem;
          font-weight: 600;
        }
        .sz-float-trust-avatars {
          display: flex;
          flex-direction: row;
          align-items: center;
        }
        .sz-float-trust-avatar {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 2px solid #fff;
          flex-shrink: 0;
        }
        .sz-float-trust-stars {
          display: flex;
          gap: 1px;
          margin-bottom: 2px;
        }
        .sz-float-trust-label {
          margin: 0;
          font-size: 0.72rem;
          font-weight: 700;
          color: #1e1b2e;
          white-space: nowrap;
        }
        .sz-float-services-title {
          margin: 0 0 0.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: #1e1b2e;
        }
        .sz-float-services-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .sz-float-services-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.72rem;
          color: #374151;
        }
        .sz-float-services-price {
          font-weight: 700;
          color: #7c3aed;
        }

        /* ── Search bar ── */
        .sz-searchbar-wrap {
          position: absolute;
          bottom: -36px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          padding: 0 1.25rem;
          z-index: 20;
        }
        .sz-searchbar {
          display: flex;
          align-items: stretch;
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 20px 60px rgba(30,27,46,0.16);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          width: 100%;
          max-width: 860px;
        }
        .sz-searchbar-zone {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0.9rem 1.25rem;
          flex: 1;
          min-width: 0;
        }
        .sz-searchbar-label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #9ca3af;
          margin-bottom: 0.2rem;
          display: block;
        }
        .sz-searchbar-val {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e1b2e;
        }
        .sz-searchbar-input {
          border: none;
          outline: none;
          background: none;
          font-family: inherit;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e1b2e;
          width: 100%;
          padding: 0;
        }
        .sz-searchbar-input::placeholder { color: #9ca3af; font-weight: 400; }
        .sz-searchbar-date { color: #6b7280; }
        .sz-searchbar-date::-webkit-calendar-picker-indicator { opacity: 0.4; cursor: pointer; }
        .sz-searchbar-divider {
          width: 1px;
          background: #e5e7eb;
          flex-shrink: 0;
          margin: 0.75rem 0;
        }
        .sz-searchbar-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0 1.75rem;
          background: #7c3aed;
          color: #fff;
          border: none;
          font-family: inherit;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          border-radius: 0 18px 18px 0;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .sz-searchbar-btn:hover { background: #6d28d9; }
        .sz-searchbar-btn:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }

        /* ── Stats strip ── */
        .sz-stats-strip {
          background: #fff;
          border-bottom: 1px solid #f3f4f6;
        }
        .sz-stats-inner {
          max-width: 1280px;
          margin: 0 auto;
          padding: 2rem 1.25rem 1.5rem;
          margin-top: 2.5rem;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }
        .sz-stat {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .sz-stat-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #f3e8ff;
          color: #7c3aed;
          flex-shrink: 0;
        }
        .sz-stat-value {
          margin: 0 0 0.1rem;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: #7c3aed;
          line-height: 1;
        }
        .sz-stat-label {
          margin: 0;
          font-size: 0.82rem;
          color: #6b7280;
        }

        /* ── Responsive ── */
        @media (min-width: 1024px) {
          .sz-hero2-inner {
            flex-direction: row;
            align-items: center;
            gap: 4rem;
            padding: 5rem 1.25rem 2rem;
          }
          .sz-hero2-copy { max-width: 520px; }
          .sz-hero2-visual {
            display: block;
            flex: 1;
            min-width: 0;
            position: relative;
            height: 520px;
          }
          .sz-hero2-imgwrap {
            position: relative;
            z-index: 2;
            max-width: 100%;
            margin: 0;
            height: 480px;
          }
          .sz-hero2-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .sz-stats-inner {
            grid-template-columns: repeat(4, 1fr);
            padding: 2rem 1.25rem;
            margin-top: 0;
          }
        }
        @media (max-width: 767px) {
          .sz-searchbar-divider { display: none; }
          .sz-searchbar {
            flex-direction: column;
            border-radius: 16px;
          }
          .sz-searchbar-btn {
            border-radius: 0 0 16px 16px;
            justify-content: center;
            padding: 0.9rem 1.25rem;
          }
          .sz-searchbar-zone { padding: 0.7rem 1rem; }
          .sz-hero2 { padding-bottom: 8rem; }
          .sz-searchbar-wrap { bottom: -28px; }
          .sz-stats-inner { padding-top: 3rem; }
        }
      `}</style>
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
    <section className="sz-section" id="how-it-works">
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
          <rect x="3" y="4" width="14" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
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
  salonCount = 0,
}: {
  isAuthenticated: boolean;
  salons: SalonListItem[];
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
        <Hero salons={salons} salonCount={salonCount} />
        <StatsStrip salonCount={salonCount} />
        <HowItWorks />
        <PopularSalons salons={salons} />
        <WhySalonomia />
        <CTASection />
      </main>
      <PageFooter />

      <style>{`
        /* ── Shared sections ─────────────────────────────── */
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
          position: relative; overflow: hidden; border-radius: 24px;
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
        }
      `}</style>
    </div>
  );
}
