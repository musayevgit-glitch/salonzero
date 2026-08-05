'use client';

import { Alert, Button, EmptyState, FormField, Input, Link, PublicShell } from '@salonomia/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api-client';

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <PublicShell>
        <EmptyState
          title="Invalid reset link"
          description="This link is missing its reset code."
          action={<Link href="/forgot-password">Request a new one</Link>}
        />
      </PublicShell>
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
          ? 'This reset link is invalid or has expired. Please request a new one.'
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <PublicShell>
        <Alert tone="success" title="Password updated">
          Redirecting you to log in…
        </Alert>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-semibold text-text-primary">Set a new password</h1>
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {error ? (
            <Alert tone="danger" title={error}>
              <Link href="/forgot-password">Request a new reset link</Link>
            </Alert>
          ) : null}
          <FormField label="New password" description="At least 8 characters.">
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
            Update password
          </Button>
        </form>
      </div>
    </PublicShell>
  );
}
