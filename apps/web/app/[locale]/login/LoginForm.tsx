'use client';

import { isSafeRedirectPath } from '@salonomia/validation';
import { Button } from '@salonomia/ui';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '../../../i18n/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { apiFetch, ApiError } from '../../../lib/api-client';
import { AuthShell } from '../../_components/AuthShell';

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
    <AuthShell title={t('loginTitle')}>
      <form onSubmit={handleSubmit} noValidate className="sz-auth-form">
        {error ? (
          <p role="alert" className="sz-auth-error">
            {error}
          </p>
        ) : null}

        <div className="sz-auth-field">
          <label htmlFor="login-email">{t('email')}</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="sz-auth-field">
          <label htmlFor="login-password">{t('password')}</label>
          <div style={{ position: 'relative', display: 'flex' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: '2.9rem' }}
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

      <div className="sz-auth-links">
        <a href="/forgot-password">{t('forgotPassword')}</a>
        <p style={{ margin: 0 }}>
          {t('noAccount')} <a href="/register">{t('register')}</a>
        </p>
      </div>
    </AuthShell>
  );
}
