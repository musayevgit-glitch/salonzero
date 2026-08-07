'use client';

import { isSafeRedirectPath } from '@salonomia/validation';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { apiFetch, ApiError } from '../../../lib/api-client';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams ? searchParams.get('returnTo') : null;
  const safeReturnTo = returnTo && isSafeRedirectPath(returnTo) ? returnTo : '/account';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch('/auth/me').catch(() => undefined);
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password }),
      });
      router.replace(safeReturnTo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 400, boxShadow: '0 10px 40px rgba(26,18,8,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.05em', color: '#1a1208' }}>
              SALONOMIA
            </span>
          </a>
          <p style={{ color: '#c9a460', fontSize: '0.875rem', marginTop: '0.5rem', margin: '0.5rem 0 0 0' }}>Eksklüziv gözəllik təcrübəsi</p>
        </div>
        
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1a1208', marginBottom: '1.5rem', textAlign: 'center', fontFamily: "'Playfair Display', Georgia, serif" }}>Qeydiyyatdan keçin</h1>
        
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error ? <div style={{ color: '#dc2626', fontSize: '0.875rem', background: '#fef2f2', padding: '0.75rem', borderRadius: 8 }}>{error}</div> : null}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: '#1a1208', fontWeight: 500 }}>Ad Soyad</label>
            <input
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ border: '1px solid #ede5dc', borderRadius: 12, padding: '0.75rem 1rem', fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', outline: 'none' }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: '#1a1208', fontWeight: 500 }}>E-poçt</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ border: '1px solid #ede5dc', borderRadius: 12, padding: '0.75rem 1rem', fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', outline: 'none' }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: '#1a1208', fontWeight: 500 }}>Şifrə</label>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ border: '1px solid #ede5dc', borderRadius: 12, padding: '0.75rem 1rem', fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', outline: 'none' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#9a8878' }}>Ən azı 8 simvol.</span>
          </div>
          
          <button type="submit" disabled={loading} style={{ background: '#5c3d28', color: 'white', borderRadius: 12, padding: '0.875rem', fontSize: '1rem', fontWeight: 500, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Gözləyin...' : 'Qeydiyyatdan keç'}
          </button>
        </form>
        
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem' }}>
          <p style={{ color: '#9a8878', margin: 0 }}>
            Artıq hesabınız var? <a href="/login" style={{ color: '#1a1208', fontWeight: 500, textDecoration: 'none' }}>Daxil ol</a>
          </p>
        </div>
      </div>
    </div>
  );
}
