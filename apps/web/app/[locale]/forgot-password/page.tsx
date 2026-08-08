'use client';

import { useState } from 'react';
import { Button } from '@salonomia/ui';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '../../../lib/api-client';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
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
        <div style={{ background: 'white', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 400, boxShadow: '0 10px 40px rgba(30,27,46,0.05)', border: '1px solid #e4d4f4' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <a href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.05em', color: '#1e1b2e' }}>
                SALONOMIA
              </span>
            </a>
            <p style={{ color: '#7c3aed', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>{t('tagline')}</p>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ color: '#166534', fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>{t('checkEmail')}</p>
            <p style={{ color: '#15803d', fontSize: '0.85rem', margin: '0.4rem 0 0 0' }}>
              {t('checkEmailDesc')}
            </p>
          </div>
          <a href="/login" style={{ display: 'block', textAlign: 'center', color: '#7c3aed', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 }}>
            {t('backToLogin')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 400, boxShadow: '0 10px 40px rgba(30,27,46,0.05)', border: '1px solid #e4d4f4' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.05em', color: '#1e1b2e' }}>
              SALONOMIA
            </span>
          </a>
          <p style={{ color: '#7c3aed', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>{t('tagline')}</p>
        </div>

        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e1b2e', marginBottom: '0.5rem', textAlign: 'center', fontFamily: "'Playfair Display', Georgia, serif" }}>
          {t('forgotPasswordTitle')}
        </h1>
        <p style={{ color: '#7c6fa0', fontSize: '0.875rem', textAlign: 'center', margin: '0 0 1.5rem 0' }}>
          {t('forgotPasswordSubtitle')}
        </p>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error ? <div style={{ color: '#dc2626', fontSize: '0.875rem', background: '#fef2f2', padding: '0.75rem', borderRadius: 8 }}>{error}</div> : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: '#1e1b2e', fontWeight: 500 }}>{t('email')}</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ border: '1px solid #e4d4f4', borderRadius: 12, padding: '0.75rem 1rem', fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', outline: 'none' }}
            />
          </div>

          <Button type="submit" loading={status === 'loading'} disabled={status === 'loading'} style={{ width: '100%', marginTop: '0.5rem' }}>
            {t('forgotPasswordBtn')}
          </Button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <a href="/login" style={{ color: '#7c6fa0', textDecoration: 'none' }}>{t('backToLogin')}</a>
        </div>
      </div>
    </div>
  );
}
