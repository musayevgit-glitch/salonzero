'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

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

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Ad A-Z' },
  { value: 'name_desc', label: 'Ad Z-A' },
  { value: 'salon_asc', label: 'Salon A-Z' },
];

export function StilistlerClient({ stylists }: { stylists: Stylist[] }) {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState('name_asc');
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingCity, setPendingCity] = useState('');
  const [pendingSort, setPendingSort] = useState('name_asc');
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const s of stylists) {
      if (s.salon.city) set.add(s.salon.city);
    }
    return Array.from(set).sort();
  }, [stylists]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const c = city.toLowerCase();
    let list = stylists.filter((s) => {
      const matchQ =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.salon.name.toLowerCase().includes(q);
      const matchC = !c || (s.salon.city || '').toLowerCase().includes(c);
      return matchQ && matchC;
    });

    if (sort === 'name_asc') list = list.slice().sort((a, b) => a.fullName.localeCompare(b.fullName, 'az'));
    else if (sort === 'name_desc') list = list.slice().sort((a, b) => b.fullName.localeCompare(a.fullName, 'az'));
    else if (sort === 'salon_asc') list = list.slice().sort((a, b) => a.salon.name.localeCompare(b.salon.name, 'az'));

    return list;
  }, [stylists, search, city, sort]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setSearch(pendingSearch);
    setCity(pendingCity);
    setSort(pendingSort);
  }

  function resetFilters() {
    setPendingSearch('');
    setPendingCity('');
    setPendingSort('name_asc');
    setSearch('');
    setCity('');
    setSort('name_asc');
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Page heading */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2.5rem', fontWeight: 700, color: '#1a1208', margin: '0 0 1rem 0' }}>
          Stilistlər
        </h1>
        <p style={{ color: '#9a8878', fontSize: '1rem', margin: 0 }}>
          Peşəkar stilistləri tapın, portfoliolarına baxın və rezervasiya edin.
        </p>
      </div>

      {/* Filter panel — matches Salonlar exactly */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #ede5dc', padding: '1.5rem', marginBottom: '2.5rem' }}>
        <form onSubmit={applyFilters} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1208' }}>Axtarış</label>
            <input
              type="text"
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              placeholder="Stilist və ya salon adı..."
              style={{ height: 44, boxSizing: 'border-box', padding: '0 1rem', borderRadius: 8, border: '1px solid #ede5dc', outline: 'none', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1208' }}>Şəhər</label>
            {cities.length > 0 ? (
              <select
                value={pendingCity}
                onChange={(e) => setPendingCity(e.target.value)}
                style={{ height: 44, boxSizing: 'border-box', padding: '0 1rem', borderRadius: 8, border: '1px solid #ede5dc', outline: 'none', fontSize: '0.9rem', backgroundColor: 'white' }}
              >
                <option value="">Bütün şəhərlər</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={pendingCity}
                onChange={(e) => setPendingCity(e.target.value)}
                placeholder="Bakı..."
                style={{ height: 44, boxSizing: 'border-box', padding: '0 1rem', borderRadius: 8, border: '1px solid #ede5dc', outline: 'none', fontSize: '0.9rem' }}
              />
            )}
          </div>

          <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1208' }}>Sıralama</label>
            <select
              value={pendingSort}
              onChange={(e) => setPendingSort(e.target.value)}
              style={{ height: 44, boxSizing: 'border-box', padding: '0 1rem', borderRadius: 8, border: '1px solid #ede5dc', outline: 'none', fontSize: '0.9rem', backgroundColor: 'white' }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: '1 1 200px' }}>
            <button
              type="submit"
              style={{ flex: 1, height: 44, boxSizing: 'border-box', background: '#5c3d28', color: 'white', border: 'none', padding: '0 1.5rem', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              Filtrləri tətbiq et
            </button>
            <button
              type="button"
              onClick={resetFilters}
              style={{ background: 'none', border: 'none', color: '#9a8878', textDecoration: 'underline', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}
            >
              Sıfırla
            </button>
          </div>
        </form>
      </div>

      {/* Results count */}
      {stylists.length > 0 && (
        <p style={{ color: '#9a8878', fontSize: '0.9rem', margin: '0 0 1.5rem 0' }}>
          {filtered.length} stilist tapıldı
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#9a8878' }}>
          <p style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: '#1a1208' }}>Stilist tapılmadı</p>
          <p>Axtarış meyarlarına uyğun heç bir stilist tapılmadı.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3rem',
          }}
        >
          {filtered.map((s, idx) => {
            const hasPortfolio = s.portfolio && s.portfolio.length > 0;
            const coverImage = hasPortfolio ? s.portfolio[0]!.imageUrl : `/images/salon-${(idx % 3) + 1}.png`;
            const initials = s.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={s.id}
                style={{
                  background: 'white',
                  borderRadius: 16,
                  border: '1px solid #ede5dc',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow 0.2s',
                  boxShadow: '0 2px 8px rgba(26,18,8,0.04)',
                }}
              >
                {/* Cover + avatar */}
                <div
                  style={{
                    height: 130,
                    background: `linear-gradient(to bottom, rgba(26,18,8,0.05), rgba(26,18,8,0.7)), url(${coverImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: '#5c3d28',
                      color: '#c9a460',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      border: '3px solid white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      position: 'absolute',
                      bottom: -22,
                      left: 18,
                      zIndex: 2,
                    }}
                  >
                    {initials}
                  </div>
                </div>

                <div style={{ padding: '2rem 1.25rem 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.15rem', color: '#1a1208', margin: '0 0 0.2rem', fontWeight: 700 }}>
                      {s.fullName}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#9a8878', margin: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {s.salon.city || 'Bakı'} · {s.salon.name}
                    </p>
                  </div>

                  {s.bio && (
                    <p style={{ fontSize: '0.85rem', color: '#6b5e4a', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {s.bio}
                    </p>
                  )}

                  {hasPortfolio && (
                    <p style={{ fontSize: '0.78rem', color: '#c9a460', fontWeight: 500, margin: 0 }}>
                      {s.portfolio.length} portfolio şəkli
                    </p>
                  )}

                  <div style={{ marginTop: 'auto', paddingTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setSelectedStylist(s)}
                      style={{ flex: 1, padding: '0.6rem', background: 'transparent', border: '1px solid #ede5dc', color: '#1a1208', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Portfolio
                    </button>
                    <Link
                      href={`/salons/${s.salon.slug}`}
                      style={{ padding: '0.6rem 1rem', background: '#5c3d28', color: 'white', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}
                    >
                      Rezerv et
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,8,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}
          onClick={() => setSelectedStylist(null)}
        >
          <div
            style={{ background: 'white', width: '100%', maxWidth: 600, maxHeight: '90dvh', borderRadius: 20, boxShadow: '0 20px 50px rgba(26,18,8,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedStylist(null)}
              style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: '50%', background: 'rgba(26,18,8,0.7)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, fontSize: '0.85rem' }}
            >
              ✕
            </button>

            <div style={{ padding: '1.75rem 2rem 1.25rem', borderBottom: '1px solid #ede5dc' }}>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.6rem', color: '#1a1208', margin: '0 0 0.25rem', fontWeight: 700 }}>
                {selectedStylist.fullName}
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#9a8878', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {selectedStylist.salon.name} · {selectedStylist.salon.city || 'Bakı'}
              </p>
              {selectedStylist.bio && (
                <div style={{ fontSize: '0.9rem', color: '#6b5e4a', lineHeight: 1.6, background: '#f9f6f3', padding: '0.85rem 1rem', borderRadius: 10, border: '1px solid #ede5dc' }}>
                  {selectedStylist.bio}
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem 2rem 2rem', overflowY: 'auto', flex: 1 }}>
              <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.15rem', color: '#1a1208', margin: '0 0 1rem', fontWeight: 700 }}>
                Portfolio
              </h3>
              {!selectedStylist.portfolio || selectedStylist.portfolio.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', borderRadius: 12, border: '1px dashed #ede5dc', color: '#9a8878' }}>
                  Bu stilist hələ portfolio şəkli yükləməyib.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  {selectedStylist.portfolio.map((item) => (
                    <div key={item.id} style={{ borderRadius: 10, border: '1px solid #ede5dc', overflow: 'hidden' }}>
                      <div style={{ aspectRatio: '1', backgroundImage: `url(${item.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      {item.caption && (
                        <p style={{ fontSize: '0.75rem', color: '#6b5e4a', margin: 0, padding: '0.4rem 0.5rem', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 2rem calc(1rem + env(safe-area-inset-bottom))', borderTop: '1px solid #ede5dc', display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setSelectedStylist(null)}
                style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid #ede5dc', color: '#9a8878', borderRadius: 10, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Bağla
              </button>
              <Link
                href={`/salons/${selectedStylist.salon.slug}`}
                style={{ flex: 2, padding: '0.8rem', background: '#5c3d28', color: 'white', borderRadius: 10, fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', textAlign: 'center', boxShadow: '0 4px 12px rgba(92,61,40,0.2)' }}
              >
                Salona keç · Rezervasiya et
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 1024px) { div[style*="repeat(auto-fill, minmax(280px"] { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (min-width: 768px) and (max-width: 1023px) { div[style*="repeat(auto-fill, minmax(280px"] { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 767px) { div[style*="repeat(auto-fill, minmax(280px"] { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
