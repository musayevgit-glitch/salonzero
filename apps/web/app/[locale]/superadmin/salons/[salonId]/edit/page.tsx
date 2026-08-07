'use client';

import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  PermissionDeniedState,
  Skeleton,
  Textarea,
  useToast,
} from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../../lib/api-client';

interface SalonDetail {
  id: string;
  name: string;
  timezone: string;
  city: string | null;
  description: string | null;
  updatedAt: string;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; salon: SalonDetail };

export default function EditSalonPage() {
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<SalonDetail>(`/salons/${salonId}`)
      .then((salon) => {
        setState({ kind: 'ready', salon });
        setName(salon.name);
        setTimezone(salon.timezone);
        setCity(salon.city ?? '');
        setDescription(salon.description ?? '');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/superadmin/salons/${salonId}/edit`);
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setState({ kind: 'permission-denied' });
          return;
        }
        setState({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong.',
        });
      });
  }, [salonId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== 'ready' || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/salons/${salonId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          timezone,
          city: city || null,
          description: description || null,
          expectedUpdatedAt: state.salon.updatedAt,
        }),
      });
      showToast('Salon updated');
      router.push(`/superadmin/salons/${salonId}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('This salon was changed by someone else. Reload the page and try again.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === 'loading') {
    return (
      <main className="p-8">
        <Skeleton className="h-64 w-full max-w-lg" />
      </main>
    );
  }

  if (state.kind === 'permission-denied') {
    return (
      <main className="p-8">
        <PermissionDeniedState />
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className="p-8">
        <ErrorState title="Couldn't load this salon" description={state.message} />
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6 p-8">
      <Breadcrumbs
        items={[
          { label: 'Salons', href: '/superadmin/salons' },
          { label: state.salon.name, href: `/superadmin/salons/${salonId}` },
          { label: 'Edit' },
        ]}
      />
      <Card className="max-w-lg">
        <h1 className="text-xl font-semibold text-text-primary">Edit salon</h1>
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

          <Button type="submit" loading={submitting} disabled={submitting}>
            Save changes
          </Button>
        </form>
      </Card>
    </main>
  );
}
