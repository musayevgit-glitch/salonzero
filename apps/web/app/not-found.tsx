'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageLayout } from './_components/PageLayout';

const scissors = ['✂️', '💆', '💅', '🪮', '🧴'];

export default function NotFound() {
  const [emoji, setEmoji] = useState('✂️');
  const [snipped, setSnipped] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setEmoji(scissors[Math.floor(Math.random() * scissors.length)]);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <PageLayout>
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 1.5rem',
        gap: '1.5rem',
      }}>
        {/* Animated number with scissors */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(6rem, 20vw, 10rem)',
            fontWeight: 700,
            color: '#ede5dc',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            userSelect: 'none',
          }}>
            4<span style={{ color: '#c9a460' }}>0</span>4
          </div>
          <button
            onClick={() => setSnipped(s => !s)}
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
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
            color: '#1a1208',
            margin: '0 0 0.5rem',
            fontWeight: 700,
          }}>
            {snipped ? 'Bəli, kəsildi!' : 'Səhifə tapılmadı'}
          </h1>
          <p style={{ color: '#9a8878', fontSize: '1.05rem', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
            {snipped
              ? 'Bu URL artıq bizim stillər kitabından çıxarıldı 😄'
              : 'Bu URL sanki pis bir saç kəsimi kimi yox oldu — izi qalmadı.'}
          </p>
        </div>

        {/* Decorative divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#c9a460', fontSize: '1rem', opacity: 0.7 }}>
          <span style={{ height: 1, width: 60, background: '#ede5dc', display: 'inline-block' }} />
          ✦
          <span style={{ height: 1, width: 60, background: '#ede5dc', display: 'inline-block' }} />
        </div>

        {/* Suggestion cards */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', maxWidth: 560 }}>
          {[
            { href: '/', label: 'Ana Səhifə', icon: '🏠' },
            { href: '/salons', label: 'Salonlar', icon: '💈' },
            { href: '/stilistler', label: 'Stilistlər', icon: '✂️' },
          ].map(({ href, label, icon }) => (
            <Link key={href} href={href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: 12,
              border: '1px solid #ede5dc',
              color: '#1a1208',
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
              background: 'white',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = '#c9a460';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 2px 12px rgba(201,164,96,0.15)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = '#ede5dc';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
            }}>
              <span>{icon}</span> {label}
            </Link>
          ))}
        </div>

        {/* Main CTA */}
        <Link href="/salons" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.8rem 2rem',
          background: '#5c3d28',
          color: 'white',
          borderRadius: 12,
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '0.95rem',
          boxShadow: '0 4px 15px rgba(92,61,40,0.2)',
          transition: 'opacity 0.2s',
        }}>
          Salon tap 💈
        </Link>
      </div>
    </PageLayout>
  );
}
