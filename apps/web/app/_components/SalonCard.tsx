'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { formatMoney } from '../../lib/format-money';
import { getInitials } from '../../lib/initials';
import { resolveSalonCoverUrl, resolveSalonLogoUrl } from '../../lib/salon-images';

export interface SalonCardData {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  genderFocus: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  /** Real, active service-category names from the API. Never a hardcoded list. */
  categories?: string[];
  startingPrice: { amount: number; currency: string } | null;
  /** Mean of real customer ratings, or null when nobody has rated this salon yet. */
  avgRating?: number | null;
  /** How many ratings the average is based on. */
  ratingCount?: number;
}

/** How many category chips fit before the card collapses the rest into "+N". */
const MAX_VISIBLE_TAGS = 3;

function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 12 12" fill="#f59e0b" aria-hidden="true">
      <path d="M6 1l1.4 2.8 3.1.45-2.25 2.2.53 3.1L6 8.1l-2.78 1.45.53-3.1L1.5 4.25l3.1-.45L6 1z" />
    </svg>
  );
}

function LocationPinIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CHIP_STYLE: React.CSSProperties = {
  padding: '0.2rem 0.6rem',
  borderRadius: 999,
  background: 'rgba(106,90,205,0.09)',
  color: '#5b21b6',
  fontSize: '0.7rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

/**
 * The single salon card used across every public surface (home page, salon listing).
 * Optional props cover the presentational differences between surfaces — there is
 * deliberately no second implementation.
 */
export function SalonCard({
  salon,
  showBookAction = true,
}: {
  salon: SalonCardData;
  /** Renders the primary "Book" action. When false the whole card links to the salon page. */
  showBookAction?: boolean;
}) {
  const t = useTranslations('salons');
  const th = useTranslations('home');
  const tr = useTranslations('ratings');

  // A salon with no ratings says so. There is no fallback score — an invented average would be
  // indistinguishable from a real one to anyone reading the card.
  const hasRating = typeof salon.avgRating === 'number' && (salon.ratingCount ?? 0) > 0;

  // Cover resolution is identical here and on the salon detail page.
  const imageUrl = resolveSalonCoverUrl(salon.coverUrl);
  const logoUrl = resolveSalonLogoUrl(salon.logoUrl);

  // Chips render only from real categories; an empty list renders nothing at all.
  const allTags = (salon.categories ?? []).filter((c) => c && c.trim().length > 0);
  const visibleTags = allTags.slice(0, MAX_VISIBLE_TAGS);
  const overflowCount = allTags.length - visibleTags.length;

  const genderKey = (salon.genderFocus ?? '').toUpperCase();
  const genderLabel =
    genderKey === 'WOMEN'
      ? t('genderWomen')
      : genderKey === 'MEN'
        ? t('genderMen')
        : genderKey === 'UNISEX'
          ? t('genderUnisex')
          : null;

  return (
    <article className="sz-salon-card">
      <Link href={`/salons/${salon.slug}`} className="sz-salon-cover" aria-label={salon.name}>
        <img src={imageUrl} alt="" aria-hidden="true" loading="lazy" className="sz-salon-cover-img" />
        <span className="sz-salon-cover-veil" aria-hidden="true" />
        {genderLabel ? <span className="sz-salon-gender">{genderLabel}</span> : null}
        {logoUrl ? (
          <img src={logoUrl} alt="" aria-hidden="true" loading="lazy" className="sz-salon-logo" />
        ) : (
          <span className="sz-salon-logo sz-salon-logo-fallback" aria-hidden="true">
            {getInitials(salon.name)}
          </span>
        )}
      </Link>

      <div className="sz-salon-body">
        <h3 className="sz-salon-name">
          <Link href={`/salons/${salon.slug}`} className="sz-salon-name-link">
            {salon.name}
          </Link>
        </h3>

        <p className="sz-salon-meta">
          <span style={{ color: '#6A5ACD', display: 'inline-flex', flexShrink: 0 }}>
            <LocationPinIcon />
          </span>
          <span className="sz-truncate">{salon.city ?? '—'}</span>
        </p>

        <div className="sz-salon-rating-row">
          {hasRating ? (
            <span className="sz-salon-rating">
              <StarIcon />
              {tr('ratingWithCount', {
                rating: (salon.avgRating as number).toFixed(1),
                count: salon.ratingCount ?? 0,
              })}
            </span>
          ) : (
            <span className="sz-salon-norating">{tr('noRating')}</span>
          )}

          {visibleTags.map((tag) => (
            <span key={tag} style={CHIP_STYLE}>
              {tag}
            </span>
          ))}
          {overflowCount > 0 ? <span style={CHIP_STYLE}>+{overflowCount}</span> : null}
        </div>

        {salon.startingPrice ? (
          <p className="sz-salon-price">
            <strong>{formatMoney(salon.startingPrice.amount)}</strong> {t('from')}
          </p>
        ) : null}

        <div className="sz-salon-actions">
          {showBookAction ? (
            <Link href={`/salons/${salon.slug}/book/service`} className="sz-salon-cta">
              {th('bookNow')}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M2.5 7h9M8 3.5 11.5 7 8 10.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          ) : (
            <Link href={`/salons/${salon.slug}`} className="sz-salon-cta">
              {th('viewSalon')}
            </Link>
          )}
        </div>
      </div>

      <style>{`
        .sz-salon-card {
          background: #fff;
          border: 1px solid #e4d4f4;
          border-radius: 18px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 4px rgba(30,27,46,0.06);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          min-width: 0;
        }
        .sz-salon-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(30,27,46,0.10);
        }
        .sz-salon-cover {
          position: relative;
          display: block;
          height: 180px;
          background: #ede4f8;
          overflow: hidden;
        }
        .sz-salon-cover:focus-visible { outline: 2px solid #7c3aed; outline-offset: -2px; }
        .sz-salon-cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.35s ease;
        }
        .sz-salon-card:hover .sz-salon-cover-img { transform: scale(1.04); }
        .sz-salon-cover-veil {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(30,27,46,0.42) 0%, rgba(30,27,46,0) 55%);
        }
        .sz-salon-gender {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255,255,255,0.94);
          color: #5b21b6;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          padding: 0.22rem 0.6rem;
          border-radius: 999px;
        }
        .sz-salon-logo {
          position: absolute;
          left: 12px;
          bottom: 12px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #fff;
          background: #fff;
          box-shadow: 0 2px 8px rgba(30,27,46,0.25);
        }
        .sz-salon-logo-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #6A5ACD;
          color: #fff;
          font-weight: 700;
          font-size: 0.85rem;
        }
        .sz-salon-body {
          padding: 1rem 1.1rem 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          flex: 1;
          min-width: 0;
        }
        .sz-salon-name { margin: 0; font-size: 1rem; font-weight: 700; line-height: 1.3; min-width: 0; }
        .sz-salon-name-link { color: #1e1b2e; text-decoration: none; }
        .sz-salon-name-link:hover { color: #6A5ACD; }
        .sz-salon-name-link:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; border-radius: 4px; }
        .sz-salon-meta {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.82rem;
          color: #7c6fa0;
          min-width: 0;
        }
        .sz-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sz-salon-rating-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.35rem;
          min-width: 0;
        }
        .sz-salon-rating {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: #4a3f6b;
        }
        .sz-salon-norating { font-size: 0.76rem; color: #9d92bd; }
        .sz-salon-price { margin: 0; font-size: 0.82rem; color: #7c6fa0; }
        .sz-salon-price strong { color: #1e1b2e; font-weight: 700; }
        .sz-salon-actions { margin-top: auto; padding-top: 0.35rem; }
        .sz-salon-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          width: 100%;
          padding: 0.65rem 0.75rem;
          border-radius: 10px;
          background: #6A5ACD;
          color: #fff;
          font-weight: 600;
          font-size: 0.86rem;
          text-decoration: none;
          transition: background 0.15s;
        }
        .sz-salon-cta:hover { background: #5c4cbe; }
        .sz-salon-cta:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
      `}</style>
    </article>
  );
}

/** Skeleton placeholder matching the card's real dimensions, for loading grids. */
export function SalonCardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      style={{
        background: '#fff',
        border: '1px solid #e4d4f4',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(30,27,46,0.06)',
      }}
    >
      <div style={{ height: 180, background: '#ede4f8' }} className="sz-skel" />
      <div style={{ padding: '1rem 1.1rem 1.1rem', display: 'grid', gap: '0.6rem' }}>
        <div style={{ height: 16, width: '65%', borderRadius: 6, background: '#ede4f8' }} className="sz-skel" />
        <div style={{ height: 12, width: '40%', borderRadius: 6, background: '#f2ecf9' }} className="sz-skel" />
        <div style={{ height: 12, width: '80%', borderRadius: 6, background: '#f2ecf9' }} className="sz-skel" />
        <div style={{ height: 38, borderRadius: 10, background: '#ede4f8', marginTop: '0.35rem' }} className="sz-skel" />
      </div>
      <style>{`
        .sz-skel { animation: szPulse 1.4s ease-in-out infinite; }
        @keyframes szPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
