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
      <header style={{ marginBottom: '1.75rem', maxWidth: 680 }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.9rem, 5vw, 2.6rem)',
            fontWeight: 700,
            color: '#1e1b2e',
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          {t('title')}
        </h1>
        <p style={{ color: '#7c6fa0', fontSize: '1rem', margin: '0.6rem 0 0', lineHeight: 1.6 }}>
          {t('pageSubtitle')}
        </p>
      </header>

      {/* Prominent search — the primary way people narrow this list. */}
      <div className="sz-search-shell">
        <svg
          width="19"
          height="19"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          style={{ flexShrink: 0, color: '#6A5ACD' }}
        >
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <label htmlFor="stylist-search" className="sz-visually-hidden">
          {t('searchLabel')}
        </label>
        <input
          id="stylist-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          autoComplete="off"
        />
      </div>

      {/* Filter panel */}
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          border: '1px solid #e4d4f4',
          padding: '1.1rem 1.25rem',
          margin: '1rem 0 2rem',
          boxShadow: '0 1px 4px rgba(30,27,46,0.06)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
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
                <label
                  htmlFor="stylist-city"
                  style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1b2e' }}
                >
                  {t('cityLabel')}
                </label>
                <input
                  id="stylist-city"
                  type="search"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t('cityPlaceholder')}
                  className="sz-filter-input"
                  style={{
                    height: 44,
                    boxSizing: 'border-box',
                    padding: '0 1rem',
                    borderRadius: 10,
                    border: '1px solid #e4d4f4',
                    outline: 'none',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    width: '100%',
                  }}
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
        <p
          aria-live="polite"
          style={{ color: '#7c6fa0', fontSize: '0.9rem', margin: '0 0 1.5rem 0' }}
        >
          {t('foundCount', { count: filtered.length })}
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="sz-list-state">
          <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden="true">
            <circle cx="44" cy="44" r="43" stroke="#e4d4f4" strokeWidth="2" />
            <circle cx="44" cy="36" r="11" stroke="#6A5ACD" strokeWidth="2.5" />
            <path
              d="M25 64c0-9.4 8.5-17 19-17s19 7.6 19 17"
              stroke="#6A5ACD"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <p style={{ fontSize: '1rem', fontWeight: 600, margin: '1rem 0 0.35rem', color: '#1e1b2e' }}>
            {t('notFoundTitle')}
          </p>
          <p style={{ color: '#7c6fa0', fontSize: '0.9rem', margin: 0 }}>{t('notFoundDesc')}</p>
        </div>
      ) : (
        <div className="stylist-grid">
          {filtered.map((s) => {
            const hasPortfolio = s.portfolio && s.portfolio.length > 0;
            // The avatar is the stylist's own first portfolio image, or their initials.
            // Nothing else — borrowing an unrelated salon photo misrepresents their work.
            const avatar = hasPortfolio ? s.portfolio[0]!.imageUrl : null;

            return (
              <article key={s.id} className="sz-stylist-card">
                <div className="sz-stylist-top">
                  {avatar ? (
                    <img className="sz-stylist-avatar" src={avatar} alt="" aria-hidden="true" loading="lazy" />
                  ) : (
                    <span className="sz-stylist-avatar sz-stylist-avatar-fb" aria-hidden="true">
                      {getInitials(s.fullName)}
                    </span>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <h3 className="sz-stylist-name">{s.fullName}</h3>
                    <p className="sz-stylist-salon">
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                        style={{ flexShrink: 0 }}
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span className="sz-truncate">
                        {s.salon.city ? `${s.salon.city} · ` : ''}
                        {s.salon.name}
                      </span>
                    </p>
                  </div>
                </div>

                {s.bio ? <p className="sz-stylist-bio">{s.bio}</p> : null}

                {hasPortfolio ? (
                  <p className="sz-stylist-portfolio">{t('portfolioCount', { count: s.portfolio.length })}</p>
                ) : null}

                <div className="sz-stylist-actions">
                  <button type="button" onClick={() => setSelectedStylist(s)} className="sz-outline-btn">
                    {t('viewPortfolio')}
                  </button>
                  <Link href={bookingHref(s)} className="sz-primary-btn">
                    {t('bookStylist')}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Portfolio Modal */}
      {selectedStylist && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(30,27,46,0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
          onClick={() => setSelectedStylist(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedStylist.fullName} — ${t('portfolioTitle')}`}
            style={{
              background: 'white',
              width: '100%',
              maxWidth: 600,
              maxHeight: '90dvh',
              borderRadius: 20,
              boxShadow: '0 20px 50px rgba(30,27,46,0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeButtonRef}
              type="button"
              aria-label={t('close')}
              onClick={() => setSelectedStylist(null)}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'rgba(30,27,46,0.7)',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                fontSize: '0.85rem',
              }}
            >
              ✕
            </button>

            <div style={{ padding: '1.75rem 2rem 1.25rem', borderBottom: '1px solid #e4d4f4' }}>
              <h2
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1.6rem',
                  color: '#1e1b2e',
                  margin: '0 0 0.25rem',
                  fontWeight: 700,
                }}
              >
                {selectedStylist.fullName}
              </h2>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: '#6b5d8a',
                  margin: '0 0 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {selectedStylist.salon.name}
                {selectedStylist.salon.city ? ` · ${selectedStylist.salon.city}` : ''}
              </p>
              {selectedStylist.bio && (
                <div
                  style={{
                    fontSize: '0.9rem',
                    color: '#6b5d8a',
                    lineHeight: 1.6,
                    background: '#faf5ff',
                    padding: '0.85rem 1rem',
                    borderRadius: 10,
                    border: '1px solid #e4d4f4',
                  }}
                >
                  {selectedStylist.bio}
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem 2rem 2rem', overflowY: 'auto', flex: 1 }}>
              <h3
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1.15rem',
                  color: '#1e1b2e',
                  margin: '0 0 1rem',
                  fontWeight: 700,
                }}
              >
                {t('portfolioTitle')}
              </h3>
              {!selectedStylist.portfolio || selectedStylist.portfolio.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem 1rem',
                    borderRadius: 12,
                    border: '1px dashed #e4d4f4',
                    color: '#7c6fa0',
                  }}
                >
                  {t('portfolioEmpty')}
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  {selectedStylist.portfolio.map((item) => (
                    <div
                      key={item.id}
                      style={{ borderRadius: 10, border: '1px solid #e4d4f4', overflow: 'hidden' }}
                    >
                      <div
                        style={{
                          aspectRatio: '1',
                          backgroundImage: `url(${item.imageUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      {item.caption && (
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b5d8a',
                            margin: 0,
                            padding: '0.4rem 0.5rem',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                padding: '1rem 2rem calc(1rem + env(safe-area-inset-bottom))',
                borderTop: '1px solid #e4d4f4',
                display: 'flex',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedStylist(null)}
                className="sz-outline-btn"
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  background: 'white',
                  border: '1.5px solid #e4d4f4',
                  color: '#6b5d8a',
                  borderRadius: 10,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {tc('cancel')}
              </button>
              <Link
                href={bookingHref(selectedStylist)}
                className="sz-primary-btn"
                style={{
                  flex: 2,
                  padding: '0.8rem',
                  background: '#7c3aed',
                  color: 'white',
                  borderRadius: 10,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                {t('bookStylist')}
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .sz-search-shell {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          width: 100%;
          background: #fff;
          border: 1px solid #e4d4f4;
          border-radius: 14px;
          padding: 0.6rem 1.1rem;
          box-shadow: 0 1px 4px rgba(30,27,46,0.06);
          box-sizing: border-box;
        }
        .sz-search-shell:focus-within { border-color: #6A5ACD; box-shadow: 0 0 0 3px rgba(106,90,205,0.18); }
        .sz-search-shell input {
          flex: 1; min-width: 0; height: 36px;
          border: none; outline: none; background: none;
          font-family: inherit; font-size: 0.95rem; color: #1e1b2e;
        }
        .sz-visually-hidden {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
        }
        .sz-filter-input:hover { border-color: #c4b5fd; }
        .sz-filter-input:focus-visible { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.25); }

        .sz-list-state {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 4rem 1rem; background: #fff;
          border: 1px dashed #e4d4f4; border-radius: 18px;
        }

        .stylist-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
          margin-bottom: 3rem;
        }
        .sz-stylist-card {
          background: #fff;
          border: 1px solid #e4d4f4;
          border-radius: 18px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          min-width: 0;
          box-shadow: 0 1px 4px rgba(30,27,46,0.06);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .sz-stylist-card:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(30,27,46,0.10); }
        .sz-stylist-top { display: flex; align-items: center; gap: 0.85rem; min-width: 0; }
        .sz-stylist-avatar {
          width: 58px; height: 58px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
          border: 2px solid #fff; box-shadow: 0 2px 10px rgba(30,27,46,0.14);
        }
        .sz-stylist-avatar-fb {
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #6A5ACD, #7c3aed);
          color: #fff; font-weight: 700; font-size: 1.05rem;
        }
        .sz-stylist-name {
          margin: 0 0 0.2rem;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.1rem; font-weight: 700; color: #1e1b2e; line-height: 1.25;
        }
        .sz-stylist-salon {
          margin: 0; display: flex; align-items: center; gap: 0.3rem;
          font-size: 0.8rem; color: #7c6fa0; min-width: 0;
        }
        .sz-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sz-stylist-bio {
          margin: 0; font-size: 0.85rem; line-height: 1.55; color: #6b5d8a;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .sz-stylist-portfolio { margin: 0; font-size: 0.78rem; font-weight: 600; color: #6A5ACD; }
        .sz-stylist-actions { margin-top: auto; padding-top: 0.5rem; display: flex; gap: 0.5rem; }
        .sz-stylist-actions .sz-outline-btn {
          flex: 1; padding: 0.6rem; background: #fff; border: 1.5px solid #e4d4f4;
          color: #4a3f6b; border-radius: 10px; font-size: 0.84rem; font-weight: 600;
          cursor: pointer; font-family: inherit;
        }
        .sz-stylist-actions .sz-primary-btn {
          flex: 1; padding: 0.6rem; background: #6A5ACD; color: #fff; border-radius: 10px;
          font-size: 0.84rem; font-weight: 600; text-decoration: none; text-align: center;
        }
        .sz-outline-btn:hover { background: #faf5ff; border-color: #c4b5fd; }
        .sz-primary-btn:hover { background: #5c4cbe; }
        .sz-outline-btn:focus-visible, .sz-primary-btn:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }

        @media (min-width: 640px) { .stylist-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .stylist-grid { grid-template-columns: repeat(3, 1fr); } }
      `}</style>
    </div>
  );
}
