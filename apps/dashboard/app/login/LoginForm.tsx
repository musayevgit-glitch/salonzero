'use client';

import { Alert, Button, FormField, Input } from '@salonomia/ui';
import { isSafeRedirectPath } from '@salonomia/validation';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api-client';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const safeReturnTo = returnTo && isSafeRedirectPath(returnTo) ? returnTo : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-text-primary">Salonomia Dashboard</h1>
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
      </div>
    </main>
  );
}
