'use client';

import { Alert, Button, EmptyState, FormField, Input } from '@salonomia/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { apiFetch, ApiError } from '../../../../lib/api-client';

export function AcceptInvitationForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-surface p-4">
        <EmptyState
          title="Invalid invitation link"
          description="This link is missing its invitation code."
        />
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch('/auth/me').catch(() => undefined); // prime CSRF cookie
      await apiFetch('/auth/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token, fullName, password }),
      });
      router.replace('/');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? 'This invitation is invalid or has expired.'
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-text-primary">Accept your invitation</h1>
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
          <FormField label="Set a password" description="At least 8 characters.">
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
            Accept and continue
          </Button>
        </form>
      </div>
    </main>
  );
}
