'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '../../../lib/api-client';

export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams ? searchParams.get('token') : null;

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: 20,
            padding: '2rem',
            width: '100%',
            maxWidth: 400,
            boxShadow: '0 10px 40px rgba(30,27,46,0.05)',
            border: '1px solid #e4d4f4',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: '#1e1b2e',
            }}
          >
            SALONOMIA
          </span>
          <p style={{ color: '#7c3aed', fontSize: '0.875rem', margin: '0.5rem 0 1.5rem 0' }}>
            {t('tagline')}
          </p>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#1e1b2e',
              marginBottom: '0.5rem',
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            {t('invalidLink')}
          </h1>
          <p style={{ color: '#7c6fa0', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {t('invalidResetLink')}
          </p>
          <a
            href="/forgot-password"
            style={{ color: '#7c3aed', fontSize: '0.875rem', fontWeight: 500 }}
          >
            {t('requestNewLink')}
          </a>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch('/auth/me').catch(() => undefined); // prime CSRF cookie
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
      setTimeout(() => router.replace('/login'), 2000);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? 'Bu sıfırlama linki etibarsız və ya vaxtı keçmişdir. Yeni link tələb edin.'
          : 'Xəta baş verdi. Yenidən cəhd edin.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: 20,
            padding: '2rem',
            width: '100%',
            maxWidth: 400,
            boxShadow: '0 10px 40px rgba(30,27,46,0.05)',
            border: '1px solid #e4d4f4',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: '#1e1b2e',
            }}
          >
            SALONOMIA
          </span>
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 10,
              padding: '1rem 1.25rem',
              margin: '1.5rem 0 0 0',
            }}
          >
            <p style={{ color: '#166534', fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>
              {t('resetSuccess')}
            </p>
            <p style={{ color: '#15803d', fontSize: '0.85rem', margin: '0.4rem 0 0 0' }}>
              {t('redirecting')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 20,
          padding: '2rem',
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 10px 40px rgba(30,27,46,0.05)',
          border: '1px solid #e4d4f4',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '1.5rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: '#1e1b2e',
              }}
            >
              SALONOMIA
            </span>
          </a>
          <p style={{ color: '#7c3aed', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
            {t('tagline')}
          </p>
        </div>

        <h1
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#1e1b2e',
            marginBottom: '1.5rem',
            textAlign: 'center',
            fontFamily: "'Playfair Display', Georgia, serif",
          }}
        >
          {t('resetPasswordTitle')}
        </h1>

        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          {error ? (
            <div
              style={{
                color: '#dc2626',
                fontSize: '0.875rem',
                background: '#fef2f2',
                padding: '0.75rem',
                borderRadius: 8,
              }}
            >
              {error}{' '}
              <a href="/forgot-password" style={{ color: '#dc2626', fontWeight: 600 }}>
                {t('requestNewLink')}
              </a>
            </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: '#1e1b2e', fontWeight: 500 }}>
              {t('password')}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                border: '1px solid #e4d4f4',
                borderRadius: 12,
                padding: '0.75rem 1rem',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: '#7c6fa0' }}>{t('passwordMinLength')}</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#7c3aed',
              color: 'white',
              borderRadius: 12,
              padding: '0.875rem',
              fontSize: '1rem',
              fontWeight: 500,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '0.5rem',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? t('submitting') : t('resetPasswordBtn')}
          </button>
        </form>
      </div>
    </div>
  );
}
