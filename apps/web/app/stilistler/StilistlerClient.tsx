'use client';

import { useState } from 'react';
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

export function StilistlerClient({ stylists }: { stylists: Stylist[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);

  // Filter stylists based on search
  const filteredStylists = stylists.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(query) ||
      s.salon.name.toLowerCase().includes(query) ||
      (s.salon.city && s.salon.city.toLowerCase().includes(query))
    );
  });

  return (
    <div style={{ position: 'relative' }}>
      {/* Hero Section */}
      <div
        style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #1a1208 0%, #2b1f11 100%)',
          borderRadius: 24,
          marginBottom: '3rem',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(26,18,8,0.15)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '50%',
            height: '140%',
            background: 'radial-gradient(ellipse at center, rgba(201,164,96,0.18) 0%, rgba(201,164,96,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '2.5rem',
            fontWeight: 700,
            margin: '0 0 1rem 0',
            position: 'relative',
            zIndex: 1,
            letterSpacing: '-0.02em',
          }}
        >
          Stilistlərimiz
        </h1>
        <p
          style={{
            fontSize: '1rem',
            color: '#ede5dc',
            maxWidth: 600,
            margin: '0 auto 2rem auto',
            lineHeight: 1.6,
            position: 'relative',
            zIndex: 1,
          }}
        >
          Salonomia platformasındakı peşəkar stilistlərin əl işlərinə baxın, portfoliosunu araşdırın və sizə ən uyğun olan mütəxəssisi seçin.
        </p>

        {/* Search Input */}
        <div style={{ position: 'relative', maxWidth: 450, margin: '0 auto', zIndex: 2 }}>
          <input
            type="text"
            placeholder="Stilist və ya salon axtarın..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.85rem 1.25rem 0.85rem 3rem',
              borderRadius: 14,
              border: 'none',
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'all 0.3s ease',
              borderBottom: '2px solid rgba(201,164,96,0.3)',
            }}
          />
          <svg
            style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#c9a460' }}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Stylist Grid */}
      {filteredStylists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#9a8878' }}>
          <svg
            style={{ margin: '0 auto 1rem', color: '#c9a460' }}
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3 style={{ fontSize: '1.2rem', color: '#1a1208', marginBottom: '0.5rem' }}>Stilist tapılmadı</h3>
          <p>Axtarış meyarlarına uyğun heç bir stilist tapılmadı.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem',
            marginBottom: '4rem',
          }}
        >
          {filteredStylists.map((s, idx) => {
            const hasPortfolio = s.portfolio && s.portfolio.length > 0;
            const coverImage = hasPortfolio
              ? s.portfolio[0]!.imageUrl
              : `/images/salon-${(idx % 3) + 1}.png`; // fallback image

            // Get initials for avatar
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
                  borderRadius: 20,
                  border: '1px solid #ede5dc',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(26,18,8,0.02)',
                }}
              >
                {/* Stylist Banner / Header Cover */}
                <div
                  style={{
                    height: 140,
                    background: `linear-gradient(to bottom, rgba(26,18,8,0.1), rgba(26,18,8,0.85)), url(${coverImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: '50%',
                      background: '#1a1208',
                      color: '#c9a460',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      border: '3px solid white',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                      position: 'absolute',
                      bottom: -22,
                      left: 20,
                      zIndex: 2,
                    }}
                  >
                    {initials}
                  </div>
                </div>

                <div style={{ padding: '2rem 1.25rem 1.25rem 1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div>
                    <h3
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: '1.25rem',
                        color: '#1a1208',
                        margin: '0 0 0.2rem 0',
                        fontWeight: 700,
                      }}
                    >
                      {s.fullName}
                    </h3>
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: '#9a8878',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {s.salon.city || 'Bakı'} • {s.salon.name}
                    </p>
                  </div>

                  {s.bio && (
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: '#6b5e4a',
                        lineHeight: 1.5,
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {s.bio}
                    </p>
                  )}

                  <div style={{ marginTop: 'auto', paddingTop: '0.8rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setSelectedStylist(s)}
                      style={{
                        flex: 1,
                        padding: '0.65rem',
                        background: 'transparent',
                        border: '1px solid #c9a460',
                        color: '#1a1208',
                        borderRadius: 10,
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Portfolioma bax
                    </button>
                    <Link
                      href={`/salons/${s.salon.slug}`}
                      style={{
                        padding: '0.65rem 1rem',
                        background: '#1a1208',
                        color: 'white',
                        borderRadius: 10,
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        textAlign: 'center',
                        cursor: 'pointer',
                      }}
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

      {/* Detail & Portfolio Modal */}
      {selectedStylist && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(26,18,8,0.65)',
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
            style={{
              background: '#faf5f0',
              width: '100%',
              maxWidth: 600,
              maxHeight: '90dvh',
              borderRadius: 24,
              boxShadow: '0 20px 50px rgba(26,18,8,0.3)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedStylist(null)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(26,18,8,0.8)',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
                fontSize: '1rem',
              }}
            >
              ✕
            </button>

            {/* Modal Header */}
            <div
              style={{
                padding: '2rem 2rem 1.5rem 2rem',
                background: 'white',
                borderBottom: '1px solid #ede5dc',
              }}
            >
              <h2
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1.75rem',
                  color: '#1a1208',
                  margin: '0 0 0.3rem 0',
                  fontWeight: 700,
                }}
              >
                {selectedStylist.fullName}
              </h2>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: '#9a8878',
                  margin: '0 0 1rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {selectedStylist.salon.name} • {selectedStylist.salon.city || 'Bakı'}
              </p>
              
              {selectedStylist.bio && (
                <div style={{ fontSize: '0.9rem', color: '#6b5e4a', lineHeight: 1.6, background: '#faf5f0', padding: '1rem', borderRadius: 12, border: '1px solid #ede5dc' }}>
                  <p style={{ margin: 0, fontWeight: 500, color: '#1a1208', marginBottom: '0.25rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stilist haqqında</p>
                  {selectedStylist.bio}
                </div>
              )}
            </div>

            {/* Modal Body / Scrollable Portfolio */}
            <div style={{ padding: '1.5rem 2rem 2rem 2rem', overflowY: 'auto', flex: 1 }}>
              <h3
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1.25rem',
                  color: '#1a1208',
                  margin: '0 0 1rem 0',
                  fontWeight: 700,
                }}
              >
                Əl İşləri (Portfolio)
              </h3>

              {!selectedStylist.portfolio || selectedStylist.portfolio.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'white', borderRadius: 16, border: '1px dashed #ede5dc', color: '#9a8878' }}>
                  Bu stilist hələ portfolio şəkli yükləməyib.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {selectedStylist.portfolio.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: 'white',
                        borderRadius: 12,
                        border: '1px solid #ede5dc',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
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
                            color: '#6b5e4a',
                            margin: 0,
                            padding: '0.5rem',
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

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 2rem calc(1rem + env(safe-area-inset-bottom)) 2rem',
                background: 'white',
                borderTop: '1px solid #ede5dc',
                display: 'flex',
                gap: '1rem',
              }}
            >
              <button
                onClick={() => setSelectedStylist(null)}
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  background: 'transparent',
                  border: '1px solid #ede5dc',
                  color: '#9a8878',
                  borderRadius: 12,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Bağla
              </button>
              <Link
                href={`/salons/${selectedStylist.salon.slug}`}
                style={{
                  flex: 2,
                  padding: '0.85rem',
                  background: '#1a1208',
                  color: 'white',
                  borderRadius: 12,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  textAlign: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(26,18,8,0.15)',
                }}
              >
                Rezervasiya et
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
