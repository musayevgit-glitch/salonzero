'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuperadminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/superadmin/salons');
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf5f0' }}>
      <p style={{ color: '#9a8878', fontSize: '0.95rem' }}>Yönləndirilir...</p>
    </div>
  );
}
