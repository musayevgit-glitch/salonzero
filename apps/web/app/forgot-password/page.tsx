'use client';

import { Alert, Button, FormField, Input, Link, PublicShell } from '@salonomia/ui';
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
      // (docs/security/authentication.md); the UI reflects that by always showing success.
      await apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  if (status === 'sent') {
    return (
      <PublicShell>
        <div className="mx-auto max-w-sm">
          <Alert tone="success" title="Check your email">
            If an account exists for that email, we&apos;ve sent reset instructions.
          </Alert>
          <p className="mt-4 text-sm">
            <Link href="/login">Back to log in</Link>
          </p>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-semibold text-text-primary">Forgot your password?</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Enter your email and we&apos;ll send you reset instructions.
        </p>
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
          <Button type="submit" loading={status === 'loading'}>
            Send reset instructions
          </Button>
        </form>
      </div>
    </PublicShell>
  );
}
