'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError(null);
    try {
      // Same generic response whether or not the email exists — enumeration resistance
      await apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setError(err instanceof ApiError ? err.message : 'Xəta baş verdi. Yenidən cəhd edin.');
    }
  }

  if (status === 'sent') {
    return (
      <div style={{ minHeight: '100vh', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ background: 'white', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 400, boxShadow: '0 10px 40px rgba(26,18,8,0.05)', border: '1px solid #ede5dc' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <a href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.05em', color: '#1a1208' }}>
                SALONOMIA
              </span>
            </a>
            <p style={{ color: '#c9a460', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>Eksklüziv gözəllik təcrübəsi</p>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ color: '#166534', fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>E-poçtunuzu yoxlayın</p>
            <p style={{ color: '#15803d', fontSize: '0.85rem', margin: '0.4rem 0 0 0' }}>
              Həmin e-poçt ünvanı ilə hesab varsa, sıfırlama təlimatları göndərildi.
            </p>
          </div>
          <a href="/login" style={{ display: 'block', textAlign: 'center', color: '#5c3d28', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 }}>
            ← Girişə qayıt
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 400, boxShadow: '0 10px 40px rgba(26,18,8,0.05)', border: '1px solid #ede5dc' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.05em', color: '#1a1208' }}>
              SALONOMIA
            </span>
          </a>
          <p style={{ color: '#c9a460', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>Eksklüziv gözəllik təcrübəsi</p>
        </div>

        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1a1208', marginBottom: '0.5rem', textAlign: 'center', fontFamily: "'Playfair Display', Georgia, serif" }}>
          Şifrəni unutdunuz?
        </h1>
        <p style={{ color: '#9a8878', fontSize: '0.875rem', textAlign: 'center', margin: '0 0 1.5rem 0' }}>
          E-poçtunuzu daxil edin, sıfırlama təlimatları göndərəcəyik.
        </p>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error ? <div style={{ color: '#dc2626', fontSize: '0.875rem', background: '#fef2f2', padding: '0.75rem', borderRadius: 8 }}>{error}</div> : null}

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

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{ background: '#5c3d28', color: 'white', borderRadius: 12, padding: '0.875rem', fontSize: '1rem', fontWeight: 500, border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer', marginTop: '0.5rem', opacity: status === 'loading' ? 0.7 : 1 }}
          >
            {status === 'loading' ? 'Gözləyin...' : 'Sıfırlama linki göndər'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <a href="/login" style={{ color: '#9a8878', textDecoration: 'none' }}>← Girişə qayıt</a>
        </div>
      </div>
    </div>
  );
}
