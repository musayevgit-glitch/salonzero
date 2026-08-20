'use client';

import { isSafeRedirectPath } from '@salonomia/validation';
import { Button } from '@salonomia/ui';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '../../../i18n/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { apiFetch, ApiError } from '../../../lib/api-client';

export function LoginForm() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams ? searchParams.get('returnTo') : null;
  const safeReturnTo = returnTo && isSafeRedirectPath(returnTo) ? returnTo : '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Toggling only swaps the input's `type`; the value is untouched so nothing is retyped.
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/auth/me').then(
      () => router.replace(safeReturnTo),
      () => undefined,
    );
  }, [router, safeReturnTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      router.replace(safeReturnTo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tc('error'));
    } finally {
      setLoading(false);
    }
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
          <p
            style={{
              color: '#7c3aed',
              fontSize: '0.875rem',
              marginTop: '0.5rem',
              margin: '0.5rem 0 0 0',
            }}
          >
            {tc('tagline')}
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
          {t('loginTitle')}
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
              {error}
            </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: '#1e1b2e', fontWeight: 500 }}>
              {t('email')}
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                border: '1px solid #e4d4f4',
                borderRadius: 12,
                padding: '0.75rem 1rem',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label
              htmlFor="login-password"
              style={{ fontSize: '0.875rem', color: '#1e1b2e', fontWeight: 500 }}
            >
              {t('password')}
            </label>
            <div style={{ position: 'relative', display: 'flex' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: '1px solid #e4d4f4',
                  borderRadius: 12,
                  padding: '0.75rem 2.9rem 0.75rem 1rem',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? tc('hidePassword') : tc('showPassword')}
                aria-pressed={showPassword}
                className="sz-pw-toggle"
                style={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: '#6b5d8a',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                    <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                    <path
                      d="M3.5 16.5l13-13"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                    <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            loading={loading}
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {t('loginBtn')}
          </Button>
        </form>

        <style>{`
          .sz-pw-toggle:hover { background: #f3e8ff; color: #5b21b6; }
          .sz-pw-toggle:focus-visible { outline: 2px solid #7c3aed; outline-offset: 2px; }
        `}</style>

        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            alignItems: 'center',
            fontSize: '0.875rem',
          }}
        >
          <a href="/forgot-password" style={{ color: '#7c6fa0', textDecoration: 'none' }}>
            {t('forgotPassword')}
          </a>
          <p style={{ color: '#7c6fa0', margin: 0 }}>
            {t('noAccount')}{' '}
            <a
              href="/register"
              style={{ color: '#1e1b2e', fontWeight: 500, textDecoration: 'none' }}
            >
              {t('register')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
