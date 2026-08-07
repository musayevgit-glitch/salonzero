'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatMoney } from '../../lib/format-money';

interface SalonProps {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  genderFocus: string | null;
  startingPrice: { amount: number; currency: string } | null;
}

export function SalonCard({ salon, index }: { salon: SalonProps; index: number }) {
  const images = ['/images/salon-1.png', '/images/salon-2.png', '/images/salon-3.png'];
  const imageUrl = images[index % images.length];

  const genderLabel = 
    salon.genderFocus === 'Women' ? 'Qadın' :
    salon.genderFocus === 'Men' ? 'Kişi' :
    salon.genderFocus === 'Unisex' ? 'Uniseks' : 'Hər kəs';

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #ede5dc',
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ position: 'relative', height: 180 }}>
        {/* Replace Image component with an img for simplicity if the static asset isn't guaranteed, or keep Next Image but handle errors */}
        <div style={{ position: 'absolute', inset: 0, background: '#ede5dc' }} />
        <img
          src={imageUrl}
          alt={salon.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)' }} />
        
        <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1208', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '1rem', border: '2px solid white' }}>
            {salon.name.charAt(0).toUpperCase()}
          </div>
          <h3 style={{ margin: 0, color: 'white', fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.1rem', fontWeight: 600 }}>
            {salon.name}
          </h3>
        </div>
      </div>

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#9a8878', fontSize: '0.875rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {salon.city || 'Bakı'}
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#faf5f0', color: '#1a1208', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
            {genderLabel}
          </span>
        </div>

        {salon.startingPrice && (
          <div style={{ fontSize: '0.875rem', color: '#6b5e4a', fontWeight: 500 }}>
            Qiymət: <span style={{ color: '#1a1208', fontWeight: 600 }}>{formatMoney(salon.startingPrice.amount)}</span>-dən
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #ede5dc', display: 'flex', justifyContent: 'flex-end' }}>
          <Link href={`/salons/${salon.slug}`} style={{ color: '#c9a460', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            Baxmaq <span style={{ fontSize: '1.1rem' }}>&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
