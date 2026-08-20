'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const scissors = ['✂️', '💆', '💅', '🪮', '🧴'];

export default function NotFound() {
  const [emoji, setEmoji] = useState('✂️');
  const [snipped, setSnipped] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setEmoji(scissors[Math.floor(Math.random() * scissors.length)] ?? '✂️');
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#faf5ff',
      }}
    >
      {/* Minimal header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e4d4f4',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 1.25rem',
            height: 64,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <a href="/" style={{ textDecoration: 'none' }}>
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '1.2rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: '#1e1b2e',
              }}
            >
              SALONOMIA
            </span>
          </a>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '4rem 1.5rem',
            gap: '1.5rem',
          }}
        >
          {/* Animated number with scissors */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(6rem, 20vw, 10rem)',
                fontWeight: 700,
                color: '#e4d4f4',
                lineHeight: 1,
                letterSpacing: '-0.04em',
                userSelect: 'none',
              }}
            >
              4<span style={{ color: '#7c3aed' }}>0</span>4
            </div>
            <button
              onClick={() => setSnipped((s) => !s)}
              aria-label="Kəs"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) rotate(${snipped ? 45 : 0}deg)`,
                fontSize: '2.5rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1)',
                filter: 'drop-shadow(0 2px 8px rgba(201,164,96,0.4))',
              }}
            >
              {emoji}
            </button>
          </div>

          {/* Heading */}
          <div>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
                color: '#1e1b2e',
                margin: '0 0 0.5rem',
                fontWeight: 700,
              }}
            >
              {snipped ? 'Bəli, kəsildi!' : 'Səhifə tapılmadı'}
            </h1>
            <p
              style={{
                color: '#7c6fa0',
                fontSize: '1.05rem',
                maxWidth: 400,
                margin: '0 auto',
                lineHeight: 1.6,
              }}
            >
              {snipped
                ? 'Bu URL artıq bizim stillər kitabından çıxarıldı 😄'
                : 'Bu URL sanki pis bir saç kəsimi kimi yox oldu — izi qalmadı.'}
            </p>
          </div>

          {/* Decorative divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#7c3aed',
              fontSize: '1rem',
              opacity: 0.7,
            }}
          >
            <span
              style={{ height: 1, width: 60, background: '#e4d4f4', display: 'inline-block' }}
            />
            ✦
            <span
              style={{ height: 1, width: 60, background: '#e4d4f4', display: 'inline-block' }}
            />
          </div>

          {/* Suggestion cards */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              justifyContent: 'center',
              maxWidth: 560,
            }}
          >
            {[
              { href: '/', label: 'Ana Səhifə', icon: '🏠' },
              { href: '/az/salons', label: 'Salonlar', icon: '💈' },
              { href: '/az/stilistler', label: 'Stilistlər', icon: '✂️' },
            ].map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  borderRadius: 12,
                  border: '1px solid #e4d4f4',
                  color: '#1e1b2e',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  background: 'white',
                }}
              >
                <span>{icon}</span> {label}
              </Link>
            ))}
          </div>

          {/* Main CTA */}
          <Link
            href="/az/salons"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.8rem 2rem',
              background: '#7c3aed',
              color: 'white',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              boxShadow: '0 4px 15px rgba(92,61,40,0.2)',
            }}
          >
            Salon tap 💈
          </Link>
        </div>
      </main>

      <footer
        style={{ background: 'white', borderTop: '1px solid #e4d4f4', padding: '1.5rem 1.25rem' }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '0.78rem', color: '#7c6fa0' }}>
            © {new Date().getFullYear()} Salonomia. Bütün hüquqlar qorunur.
          </p>
        </div>
      </footer>
    </div>
  );
}
