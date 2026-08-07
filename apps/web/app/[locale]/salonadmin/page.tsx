'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { PageLayout } from '../../_components/PageLayout';
import Link from 'next/link';

interface CustomerProfile {
  managedSalons?: { id: string; name: string }[];
}

export default function SalonadminPortalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salons, setSalons] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    apiFetch<CustomerProfile>('/customer/profile')
      .then((profile) => {
        const managed = profile.managedSalons ?? [];
        if (managed.length === 0) {
          router.replace('/account');
        } else if (managed.length === 1 && managed[0]) {
          router.replace(`/salon/${managed[0].id}/reservations`);
        } else {
          setSalons(managed);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login?returnTo=/salonadmin');
        } else {
          router.replace('/account');
        }
      });
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf5ff' }}>
        <p style={{ color: '#7c6fa0', fontSize: '0.95rem' }}>Yönləndirilir...</p>
      </div>
    );
  }

  return (
    <PageLayout activeNav="account" isAuthenticated={true}>
      <div style={{ maxWidth: 500, margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2rem', fontWeight: 700, color: '#1e1b2e', marginBottom: '0.5rem' }}>
          Salon İdarəetmə Paneli
        </h1>
        <p style={{ color: '#7c6fa0', fontSize: '0.95rem', marginBottom: '2.5rem' }}>
          Zəhmət olmasa, idarə etmək istədiyiniz salonu seçin:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {salons.map((salon) => (
            <Link
              key={salon.id}
              href={`/salon/${salon.id}/reservations`}
              style={{
                background: 'white',
                border: '1px solid #e4d4f4',
                borderRadius: 16,
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                color: '#1e1b2e',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(30,27,46,0.02)',
                transition: 'transform 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#7c3aed';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e4d4f4';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span>{salon.name}</span>
              <span style={{ color: '#7c3aed', fontWeight: 700 }}>Daxil ol →</span>
            </Link>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
