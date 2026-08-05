'use client';

import { Alert, Button, FormField, Input, Link, PublicShell } from '@salonomia/ui';
import { isSafeRedirectPath } from '@salonomia/validation';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api-client';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const safeReturnTo = returnTo && isSafeRedirectPath(returnTo) ? returnTo : '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Also primes the CSRF cookie (any GET does) and skips the form entirely if already signed in —
  // the booking draft (if any) is preserved because we only ever navigate forward, never clear state.
  useEffect(() => {
    apiFetch('/auth/me').then(
      () => router.replace(safeReturnTo),
      () => undefined, // not authenticated — show the form
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
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-semibold text-text-primary">Log in</h1>
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {error ? <Alert tone="danger" title={error} /> : null}
          <FormField label="Email">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </FormField>
          <FormField label="Password">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </FormField>
          <Button type="submit" loading={loading}>
            Log in
          </Button>
        </form>
        <div className="mt-4 flex flex-col gap-1 text-sm">
          <Link href="/forgot-password">Forgot your password?</Link>
          <p className="text-text-secondary">
            No account yet? <Link href="/register">Create one</Link>
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
