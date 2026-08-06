'use client';

import { Alert, Button, Card, Checkbox, ErrorState, FormField, Input, Skeleton } from '@salonomia/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../lib/api-client';

interface CustomerProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  marketingConsent: boolean;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; profile: CustomerProfile };

export default function AccountProfilePage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  function load() {
    apiFetch<CustomerProfile>('/customer/profile')
      .then((profile) => {
        setState({ kind: 'ready', profile });
        setFullName(profile.fullName);
        setPhone(profile.phone ?? '');
        setMarketingConsent(profile.marketingConsent);
      })
      .catch((err: unknown) => {
        // Session-expired handling: bounce to login and remember where to come back to.
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login?returnTo=/account');
          return;
        }
        setState({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong.',
        });
      });
  }

  useEffect(load, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return; // duplicate-submit protection
    setSaving(true);
    setSaveError(null);
    setSavedAt(null);
    try {
      const profile = await apiFetch<CustomerProfile>('/customer/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, phone: phone || null, marketingConsent }),
      });
      setState({ kind: 'ready', profile });
      setSavedAt(Date.now());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?returnTo=/account');
        return;
      }
      setSaveError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
    }
  }

  if (state.kind === 'loading') {
    return <Skeleton className="h-64 w-full max-w-md" />;
  }

  if (state.kind === 'error') {
    return <ErrorState title="Couldn't load your profile" description={state.message} />;
  }

  return (
    <Card className="max-w-md">
      <h1 className="text-xl font-semibold text-text-primary">Your profile</h1>
      <p className="text-sm text-text-secondary">{state.profile.email}</p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {saveError ? <Alert tone="danger" title={saveError} /> : null}
        {savedAt ? <Alert tone="success" title="Profile updated" /> : null}

        <FormField label="Full name">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
            />
          )}
        </FormField>

        <FormField label="Phone" optional>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
            />
          )}
        </FormField>

        <Checkbox
          label="I'd like to receive marketing emails"
          checked={marketingConsent}
          onCheckedChange={(checked) => setMarketingConsent(checked === true)}
          disabled={saving}
        />

        <Button type="submit" loading={saving} disabled={saving}>
          Save changes
        </Button>
      </form>

      <Button variant="secondary" className="mt-4" onClick={handleLogout} loading={loggingOut}>
        Log out
      </Button>
    </Card>
  );
}
