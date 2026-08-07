'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, ApiError } from '../../../lib/api-client';

interface CustomerProfile {
  isStylist?: boolean;
  stylistSalonId?: string | null;
}

export default function StilistadminPortalPage() {
  const router = useRouter();

  useEffect(() => {
    apiFetch<CustomerProfile>('/customer/profile')
      .then((profile) => {
        if (profile.isStylist && profile.stylistSalonId) {
          router.replace(`/salon/${profile.stylistSalonId}/reservations`);
        } else {
          router.replace('/account');
        }
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login?returnTo=/stilistadmin');
        } else {
          router.replace('/account');
        }
      });
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf5f0' }}>
      <p style={{ color: '#9a8878', fontSize: '0.95rem' }}>Yönləndirilir...</p>
    </div>
  );
}
