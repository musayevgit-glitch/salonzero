'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Dropdown, SecondaryButton } from '../../_components/Dropdown';
import { getInitials } from '../../../lib/initials';

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  caption: string | null;
}

export interface Stylist {
  id: string;
  fullName: string;
  bio: string | null;
  portfolio: PortfolioItem[];
  salon: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
  };
}

/**
 * Deep-links into the booking flow with this stylist already chosen.
 * The `employee` query param is consumed by the booking service step, which stores it on
 * the booking draft and skips the stylist step entirely, so the user never re-picks.
 */
function bookingHref(stylist: Stylist): string {
  return `/salons/${stylist.salon.slug}/book/service?employee=${encodeURIComponent(stylist.id)}`;
}

export function StilistlerClient({ stylists }: { stylists: Stylist[] }) {
  const t = useTranslations('stylists');
  const tc = useTranslations('common');

  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState('name_asc');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Auto-search: filtering runs 300 ms after the last keystroke — no submit button.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Escape closes the portfolio dialog.
  useEffect(() => {
    if (!selectedStylist) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedStylist(null);
    }
    window.addEventListener('keydown', onKey);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedStylist]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const s of stylists) {
      if (s.salon.city) set.add(s.salon.city);
    }
    return Array.from(set).sort();
  }, [stylists]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const c = city.toLowerCase();
    let list = stylists.filter((s) => {
      const matchQ =
        !q || s.fullName.toLowerCase().includes(q) || s.salon.name.toLowerCase().includes(q);
      const matchC = !c || (s.salon.city || '').toLowerCase().includes(c);
      return matchQ && matchC;
    });

    if (sort === 'name_desc') {
      list = list.slice().sort((a, b) => b.fullName.localeCompare(a.fullName, 'az'));
    } else {
      list = list.slice().sort((a, b) => a.fullName.localeCompare(b.fullName, 'az'));
    }
    return list;
  }, [stylists, debouncedSearch, city, sort]);

  function resetFilters() {
    setSearch('');
    setDebouncedSearch('');
    setCity('');
    setSort('name_asc');
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Page heading */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.5rem', fontWeight: 700, color: '#1e1b2e', margin: '0 0 1rem 0' }}>
          {t('title')}
        </h1>
        <p style={{ color: '#7c6fa0', fontSize: '1rem', margin: 0 }}>{t('pageSubtitle')}</p>
      </div>

      {/* Filter panel */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e4d4f4', padding: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 0 }}>
            <label htmlFor="stylist-search" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1b2e' }}>
              {t('searchLabel')}
            </label>
            <input
              id="stylist-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
              className="sz-filter-input"
              style={{ height: 44, boxSizing: 'border-box', padding: '0 1rem', borderRadius: 10, border: '1px solid #e4d4f4', outline: 'none', fontSize: '0.9rem', fontFamily: 'inherit', width: '100%' }}
            />
          </div>

          <div style={{ flex: '1 1 160px', minWidth: 0 }}>
            {cities.length > 0 ? (
              <Dropdown
                label={t('cityLabel')}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                options={[
                  { value: '', label: t('allCities') },
                  ...cities.map((c) => ({ value: c, label: c })),
                ]}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label htmlFor="stylist-city" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1b2e' }}>
                  {t('cityLabel')}
                </label>
                <input
                  id="stylist-city"
                  type="search"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t('cityPlaceholder')}
                  className="sz-filter-input"
                  style={{ height: 44, boxSizing: 'border-box', padding: '0 1rem', borderRadius: 10, border: '1px solid #e4d4f4', outline: 'none', fontSize: '0.9rem', fontFamily: 'inherit', width: '100%' }}
                />
              </div>
            )}
          </div>

          <div style={{ flex: '1 1 160px', minWidth: 0 }}>
            {/* Sorting by salon name was removed — this list is about stylists. */}
            <Dropdown
              label={t('sortLabel')}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              options={[
                { value: 'name_asc', label: t('sortNameAsc') },
                { value: 'name_desc', label: t('sortNameDesc') },
              ]}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', minHeight: 44 }}>
            <SecondaryButton onClick={resetFilters}>{t('resetFilters')}</SecondaryButton>
          </div>
        </div>
      </div>

      {/* Results count */}
      {stylists.length > 0 && (
        <p aria-live="polite" style={{ color: '#7c6fa0', fontSize: '0.9rem', margin: '0 0 1.5rem 0' }}>
          {t('foundCount', { count: filtered.length })}
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#7c6fa0' }}>
          <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: '#1e1b2e' }}>
            {t('notFoundTitle')}
          </p>
          <p>{t('notFoundDesc')}</p>
        </div>
      ) : (
        <div className="stylist-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {filtered.map((s, idx) => {
            const hasPortfolio = s.portfolio && s.portfolio.length > 0;
            const coverImage = hasPortfolio
              ? s.portfolio[0]!.imageUrl
              : `/images/salon-${(idx % 3) + 1}.png`;

            return (
              <div
                key={s.id}
                style={{
                  background: 'white',
                  borderRadius: 16,
                  border: '1px solid #e4d4f4',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 8px rgba(30,27,46,0.04)',
                }}
              >
                {/* Cover + avatar */}
                <div
                  style={{
                    height: 130,
                    background: `linear-gradient(to bottom, rgba(30,27,46,0.05), rgba(30,27,46,0.7)), url(${coverImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: '#7c3aed',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      border: '3px solid white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      position: 'absolute',
                      bottom: -22,
                      left: 18,
                      zIndex: 2,
                    }}
                  >
                    {getInitials(s.fullName)}
                  </div>
                </div>

                <div style={{ padding: '2rem 1.25rem 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.15rem', color: '#1e1b2e', margin: '0 0 0.2rem', fontWeight: 700 }}>
                      {s.fullName}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#6b5d8a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {s.salon.city ? `${s.salon.city} · ` : ''}
                      {s.salon.name}
                    </p>
                  </div>

                  {s.bio && (
                    <p style={{ fontSize: '0.85rem', color: '#6b5d8a', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {s.bio}
                    </p>
                  )}

                  {hasPortfolio && (
                    <p style={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 500, margin: 0 }}>
                      {t('portfolioCount', { count: s.portfolio.length })}
                    </p>
                  )}

                  <div style={{ marginTop: 'auto', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedStylist(s)}
                      className="sz-outline-btn"
                      style={{ flex: 1, padding: '0.6rem', background: 'white', border: '1.5px solid #e4d4f4', color: '#1e1b2e', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {t('viewPortfolio')}
                    </button>
                    <Link
                      href={bookingHref(s)}
                      className="sz-primary-btn"
                      style={{ flex: 1, padding: '0.6rem 1rem', background: '#7c3aed', color: 'white', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}
                    >
                      {t('bookStylist')}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Portfolio Modal */}
      {selectedStylist && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(30,27,46,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}
          onClick={() => setSelectedStylist(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedStylist.fullName} — ${t('portfolioTitle')}`}
            style={{ background: 'white', width: '100%', maxWidth: 600, maxHeight: '90dvh', borderRadius: 20, boxShadow: '0 20px 50px rgba(30,27,46,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeButtonRef}
              type="button"
              aria-label={t('close')}
              onClick={() => setSelectedStylist(null)}
              style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: '50%', background: 'rgba(30,27,46,0.7)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, fontSize: '0.85rem' }}
            >
              ✕
            </button>

            <div style={{ padding: '1.75rem 2rem 1.25rem', borderBottom: '1px solid #e4d4f4' }}>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.6rem', color: '#1e1b2e', margin: '0 0 0.25rem', fontWeight: 700 }}>
                {selectedStylist.fullName}
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#6b5d8a', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {selectedStylist.salon.name}
                {selectedStylist.salon.city ? ` · ${selectedStylist.salon.city}` : ''}
              </p>
              {selectedStylist.bio && (
                <div style={{ fontSize: '0.9rem', color: '#6b5d8a', lineHeight: 1.6, background: '#faf5ff', padding: '0.85rem 1rem', borderRadius: 10, border: '1px solid #e4d4f4' }}>
                  {selectedStylist.bio}
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem 2rem 2rem', overflowY: 'auto', flex: 1 }}>
              <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.15rem', color: '#1e1b2e', margin: '0 0 1rem', fontWeight: 700 }}>
                {t('portfolioTitle')}
              </h3>
              {!selectedStylist.portfolio || selectedStylist.portfolio.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', borderRadius: 12, border: '1px dashed #e4d4f4', color: '#7c6fa0' }}>
                  {t('portfolioEmpty')}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  {selectedStylist.portfolio.map((item) => (
                    <div key={item.id} style={{ borderRadius: 10, border: '1px solid #e4d4f4', overflow: 'hidden' }}>
                      <div style={{ aspectRatio: '1', backgroundImage: `url(${item.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      {item.caption && (
                        <p style={{ fontSize: '0.75rem', color: '#6b5d8a', margin: 0, padding: '0.4rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 2rem calc(1rem + env(safe-area-inset-bottom))', borderTop: '1px solid #e4d4f4', display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSelectedStylist(null)}
                className="sz-outline-btn"
                style={{ flex: 1, padding: '0.8rem', background: 'white', border: '1.5px solid #e4d4f4', color: '#6b5d8a', borderRadius: 10, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {tc('cancel')}
              </button>
              <Link
                href={bookingHref(selectedStylist)}
                className="sz-primary-btn"
                style={{ flex: 2, padding: '0.8rem', background: '#7c3aed', color: 'white', borderRadius: 10, fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}
              >
                {t('bookStylist')}
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .sz-filter-input:hover { border-color: #c4b5fd; }
        .sz-filter-input:focus-visible { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.25); }
        .sz-outline-btn:hover { background: #faf5ff; }
        .sz-primary-btn:hover { background: #6d28d9; }
        .sz-outline-btn:focus-visible, .sz-primary-btn:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
        @media (min-width: 1024px) { .stylist-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (min-width: 768px) and (max-width: 1023px) { .stylist-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 767px) { .stylist-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
