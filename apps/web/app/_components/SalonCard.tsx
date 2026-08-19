'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { formatMoney } from '../../lib/format-money';
import { getInitials } from '../../lib/initials';

export interface SalonCardData {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  genderFocus: string | null;
  startingPrice: { amount: number; currency: string } | null;
}

const IMAGES = ['/images/salon-1.png', '/images/salon-2.png', '/images/salon-3.png'];

function LocationPinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The single salon card used across every public surface (home page, salon listing).
 * Optional props cover the presentational differences between surfaces — there is
 * deliberately no second implementation.
 */
export function SalonCard({
  salon,
  index,
  tags,
  showBookAction = true,
}: {
  salon: SalonCardData;
  index: number;
  /** Service chips rendered under the salon name. */
  tags?: string[];
  /** Renders the dedicated "Book" action alongside "View". */
  showBookAction?: boolean;
}) {
  const t = useTranslations('salons');
  const th = useTranslations('home');
  const imageUrl = IMAGES[index % IMAGES.length];

  const genderKey = (salon.genderFocus ?? '').toUpperCase();
  const genderLabel =
    genderKey === 'WOMEN'
      ? t('genderWomen')
      : genderKey === 'MEN'
        ? t('genderMen')
        : genderKey === 'UNISEX'
          ? t('genderUnisex')
          : t('genderAny');

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e4d4f4',
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ position: 'relative', height: 180 }}>
        <div style={{ position: 'absolute', inset: 0, background: '#e4d4f4' }} />
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0) 100%)' }} />

        <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#1e1b2e',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8rem',
              border: '2px solid white',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {getInitials(salon.name)}
          </div>
          <h3
            style={{
              margin: 0,
              color: 'white',
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '1.05rem',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {salon.name}
          </h3>
        </div>
      </div>

      <div style={{ padding: '1.1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.7rem', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#6b5d8a', fontSize: '0.85rem', minWidth: 0 }}>
            <span style={{ color: '#7c3aed', display: 'flex', flexShrink: 0 }}>
              <LocationPinIcon />
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {salon.city ?? '—'}
            </span>
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              background: '#f3e8ff',
              color: '#5b21b6',
              padding: '0.2rem 0.55rem',
              borderRadius: 999,
              flexShrink: 0,
            }}
          >
            {genderLabel}
          </span>
        </div>

        {tags && tags.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '0.18rem 0.6rem',
                  borderRadius: 999,
                  background: '#faf5ff',
                  color: '#6b5d8a',
                  fontSize: '0.68rem',
                  fontWeight: 500,
                  border: '1px solid #e4d4f4',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {salon.startingPrice ? (
          <div style={{ fontSize: '0.85rem', color: '#6b5d8a', fontWeight: 500 }}>
            <span style={{ color: '#1e1b2e', fontWeight: 700 }}>
              {formatMoney(salon.startingPrice.amount)}
            </span>{' '}
            {t('from')}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 'auto',
            paddingTop: '0.9rem',
            borderTop: '1px solid #e4d4f4',
            display: 'flex',
            gap: '0.5rem',
          }}
        >
          {/* "View" navigates to the salon detail page — it must never start a booking. */}
          <Link
            href={`/salons/${salon.slug}`}
            className="sz-card-view"
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3rem',
              padding: '0.55rem 0.75rem',
              borderRadius: 10,
              border: '1.5px solid #7c3aed',
              color: '#7c3aed',
              background: 'white',
              fontWeight: 600,
              fontSize: '0.85rem',
              textDecoration: 'none',
            }}
          >
            {th('viewSalon')}
          </Link>
          {showBookAction ? (
            <Link
              href={`/salons/${salon.slug}/book/service`}
              className="sz-card-book"
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.55rem 0.75rem',
                borderRadius: 10,
                border: '1.5px solid #7c3aed',
                background: '#7c3aed',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.85rem',
                textDecoration: 'none',
              }}
            >
              {th('bookNow')}
            </Link>
          ) : null}
        </div>
      </div>

      <style>{`
        .sz-card-view:hover { background: #f3e8ff; }
        .sz-card-book:hover { background: #6d28d9; border-color: #6d28d9; }
        .sz-card-view:focus-visible, .sz-card-book:focus-visible {
          outline: 2px solid #7c3aed;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
