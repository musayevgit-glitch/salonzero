'use client';

import { Alert, Button, FormField, Input, Link, PublicShell } from '@salonomia/ui';
import { isSafeRedirectPath } from '@salonomia/validation';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api-client';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
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
      // A first GET would normally prime the CSRF cookie; register is often the very first request
      // in a session, so prime it explicitly rather than relying on a page having called /auth/me.
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
    <PublicShell>
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-semibold text-text-primary">Create your account</h1>
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {error ? <Alert tone="danger" title={error} /> : null}
          <FormField label="Full name">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            )}
          </FormField>
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
          <FormField label="Password" description="At least 8 characters.">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </FormField>
          <Button type="submit" loading={loading}>
            Create account
          </Button>
        </form>
        <p className="mt-4 text-sm text-text-secondary">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </PublicShell>
  );
}
