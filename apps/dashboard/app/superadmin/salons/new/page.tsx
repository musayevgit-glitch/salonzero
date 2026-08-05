'use client';

import { Alert, Breadcrumbs, Button, Card, FormField, Input, Link, Textarea } from '@salonomia/ui';
import { useState } from 'react';
import { apiFetch, ApiError } from '../../../../lib/api-client';

interface CreateSalonResponse {
  salon: { id: string; slug: string; name: string };
  invitation: { email: string; expiresAt: string; token: string };
}

const DASHBOARD_ORIGIN = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3001';

export default function NewSalonPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [timezone, setTimezone] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateSalonResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return; // duplicate-submit protection alongside the disabled button below
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, string> = { name, timezone, adminEmail };
      if (slug) body.slug = slug;
      if (city) body.city = city;
      if (description) body.description = description;

      const created = await apiFetch<CreateSalonResponse>('/salons', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setResult(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const inviteLink = `${DASHBOARD_ORIGIN}/invitations/accept?token=${result.invitation.token}`;
    return (
      <main className="flex flex-col gap-6 p-8">
        <Breadcrumbs items={[{ label: 'Salons', href: '/superadmin/salons' }, { label: 'New' }]} />
        <Card className="max-w-lg">
          <Alert tone="success" title="Salon created">
            <p>
              <strong>{result.salon.name}</strong> ({result.salon.slug}) is ready.
            </p>
          </Alert>
          <div className="mt-4 text-sm">
            <p className="text-text-secondary">
              No email delivery is configured yet — copy this one-time invitation link and send it
              to <strong>{result.invitation.email}</strong> yourself so they can set up their
              SALON_ADMIN account:
            </p>
            <p className="mt-2 break-all rounded-[var(--radius-sm)] border border-border bg-surface p-3 font-mono text-xs">
              {inviteLink}
            </p>
            <p className="mt-2 text-text-secondary">
              Expires {new Date(result.invitation.expiresAt).toLocaleString()}.
            </p>
          </div>
          <div className="mt-4 flex gap-3">
            <Link href={`/superadmin/salons/${result.salon.id}`}>View salon</Link>
            <Link href="/superadmin/salons">Back to list</Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-8">
      <Breadcrumbs items={[{ label: 'Salons', href: '/superadmin/salons' }, { label: 'New' }]} />
      <Card className="max-w-lg">
        <h1 className="text-xl font-semibold text-text-primary">Create a salon</h1>
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {error ? <Alert tone="danger" title={error} /> : null}

          <FormField label="Salon name">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </FormField>

          <FormField label="Slug" optional description="Leave blank to generate one from the name.">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                placeholder="auto-generated"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            )}
          </FormField>

          <FormField label="Timezone" description="An IANA time zone, e.g. Asia/Baku.">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            )}
          </FormField>

          <FormField label="City" optional>
            {(fieldProps) => (
              <Input {...fieldProps} value={city} onChange={(e) => setCity(e.target.value)} />
            )}
          </FormField>

          <FormField label="Description" optional>
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </FormField>

          <FormField
            label="Initial admin email"
            description="They'll receive an invitation to become this salon's SALON_ADMIN."
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            )}
          </FormField>

          <Button type="submit" loading={submitting} disabled={submitting}>
            Create salon
          </Button>
        </form>
      </Card>
    </main>
  );
}
