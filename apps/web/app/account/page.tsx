'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api-client';
import { PageLayout } from '../_components/PageLayout';
import Link from 'next/link';

interface CustomerProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  marketingConsent: boolean;
  isSuperadmin?: boolean;
  managedSalons?: { id: string; name: string }[];
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; profile: CustomerProfile };

export default function AccountProfilePage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  function load() {
    apiFetch<CustomerProfile>('/customer/profile')
      .then((profile) => {
        setState({ kind: 'ready', profile });
        setFullName(profile.fullName);
        setPhone(profile.phone ?? '');
        setMarketingConsent(profile.marketingConsent);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login?returnTo=/account');
          return;
        }
        setState({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong.',
        });
      });
  }

  useEffect(load, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    setSavedAt(null);
    try {
      const profile = await apiFetch<CustomerProfile>('/customer/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, phone: phone || null, marketingConsent }),
      });
      setState({ kind: 'ready', profile });
      setSavedAt(Date.now());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?returnTo=/account');
        return;
      }
      setSaveError(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
    }
  }

  function getInitials(name: string) {
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  if (state.kind === 'loading') {
    return (
      <PageLayout activeNav="account" isAuthenticated={true}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 600, margin: '0 auto' }}>
          <div style={{ height: 40, width: 150, background: '#ede5dc', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: 100, width: '100%', background: '#ede5dc', borderRadius: 16, animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: 60, width: '100%', background: '#ede5dc', borderRadius: 16, animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: 60, width: '100%', background: '#ede5dc', borderRadius: 16, animation: 'pulse 1.5s infinite' }} />
        </div>
      </PageLayout>
    );
  }

  if (state.kind === 'error') {
    return (
      <PageLayout activeNav="account" isAuthenticated={true}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', color: '#1a1208', marginBottom: '1rem' }}>Xəta baş verdi</h1>
          <p style={{ color: '#9a8878' }}>{state.message}</p>
        </div>
      </PageLayout>
    );
  }

  const { profile } = state;

  return (
    <PageLayout activeNav="account" isAuthenticated={true}>
      <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#1a1208', margin: 0 }}>Hesabım</h1>
        
        {/* User profile card */}
        <div style={{ background: 'white', border: '1px solid #ede5dc', borderRadius: 16, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1a1208', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 600 }}>
            {getInitials(profile.fullName || profile.email)}
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1a1208', margin: 0 }}>{profile.fullName}</h2>
            <p style={{ color: '#9a8878', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>{profile.email}</p>
          </div>
        </div>

        {/* Edit profile form */}
        <form onSubmit={handleSubmit} style={{ background: 'white', border: '1px solid #ede5dc', borderRadius: 16, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1a1208' }}>Profil məlumatları</h3>
          {saveError && <div style={{ color: '#dc2626', fontSize: '0.85rem' }}>{saveError}</div>}
          {savedAt && <div style={{ color: '#16a34a', fontSize: '0.85rem' }}>Yadda saxlanıldı</div>}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#9a8878' }}>Ad və Soyad</label>
            <input required value={fullName} onChange={e => setFullName(e.target.value)} disabled={saving} style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid #ede5dc', fontSize: '0.95rem', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#9a8878' }}>Telefon (opsional)</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={saving} style={{ padding: '0.75rem', borderRadius: 8, border: '1px solid #ede5dc', fontSize: '0.95rem', outline: 'none' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#1a1208' }}>
            <input type="checkbox" checked={marketingConsent} onChange={e => setMarketingConsent(e.target.checked)} disabled={saving} />
            Marketinq e-poçtları almaq istəyirəm
          </label>
          <button type="submit" disabled={saving} style={{ background: '#5c3d28', color: 'white', border: 'none', borderRadius: 8, padding: '0.75rem', fontSize: '0.95rem', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', marginTop: '0.5rem' }}>
            {saving ? 'Yadda saxlanılır...' : 'Yadda saxla'}
          </button>
        </form>

        {/* Navigation links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link href="/account/reservations" style={{ background: 'white', border: '1px solid #ede5dc', borderRadius: 16, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: '#1a1208', fontWeight: 500 }}>
            Rezervasiyalarım
            <span style={{ color: '#c9a460' }}>→</span>
          </Link>
          
          {profile.isSuperadmin && (
            <Link href="/superadmin/salons" style={{ background: 'white', border: '1px solid #ede5dc', borderRadius: 16, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: '#1a1208', fontWeight: 500 }}>
              Platform idarəetmə
              <span style={{ color: '#c9a460' }}>→</span>
            </Link>
          )}

          {profile.managedSalons?.map(salon => (
            <Link key={salon.id} href={`/salon/${salon.id}/reservations`} style={{ background: 'white', border: '1px solid #ede5dc', borderRadius: 16, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: '#1a1208', fontWeight: 500 }}>
              Salon İdarəetmə: {salon.name}
              <span style={{ color: '#c9a460' }}>→</span>
            </Link>
          ))}
        </div>

        {/* Logout */}
        <button onClick={handleLogout} disabled={loggingOut} style={{ background: 'transparent', border: '1px solid #ede5dc', borderRadius: 16, padding: '1rem', color: '#9a8878', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer', marginTop: '0.5rem' }}>
          {loggingOut ? 'Çıxış edilir...' : 'Çıxış et'}
        </button>

      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </PageLayout>
  );
}
