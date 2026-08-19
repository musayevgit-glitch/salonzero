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
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../../../lib/api-client';

interface ServiceCategory {
  id: string;
  name: string;
}

interface ServiceDetail {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
  bufferMinutes: number;
  updatedAt: string;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; service: ServiceDetail };

export default function EditServicePage() {
  const router = useRouter();
  const { salonId, serviceId } = useParams<{ salonId: string; serviceId: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [bufferMinutes, setBufferMinutes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<ServiceCategory[]>(`/salons/${salonId}/service-categories`)
      .then(setCategories)
      .catch(() => undefined);
  }, [salonId]);

  useEffect(() => {
    apiFetch<ServiceDetail>(`/salons/${salonId}/services/${serviceId}`)
      .then((service) => {
        setState({ kind: 'ready', service });
        setCategoryId(service.categoryId ?? '');
        setName(service.name);
        setDescription(service.description ?? '');
        setPrice((service.priceAmount / 100).toFixed(2));
        setCurrency(service.currency);
        setDurationMinutes(String(service.durationMinutes));
        setBufferMinutes(String(service.bufferMinutes));
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/salon/${salonId}/services/${serviceId}/edit`);
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
  }, [salonId, serviceId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== 'ready' || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/salons/${salonId}/services/${serviceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          categoryId: categoryId || null,
          name,
          description: description || null,
          priceAmount: Math.round(Number(price) * 100),
          currency: currency.trim().toUpperCase(),
          durationMinutes: Number(durationMinutes),
          bufferMinutes: Number(bufferMinutes),
          expectedUpdatedAt: state.service.updatedAt,
        }),
      });
      showToast('Service updated');
      router.push(`/salon/${salonId}/services/${serviceId}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('This service was changed by someone else. Reload the page and try again.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === 'loading') {
    return (
      <main className="dashboard-page">
        <Skeleton className="h-64 w-full max-w-lg" />
      </main>
    );
  }

  if (state.kind === 'permission-denied') {
    return (
      <main className="dashboard-page">
        <PermissionDeniedState />
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className="dashboard-page">
        <ErrorState title="Couldn't load this service" description={state.message} />
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <Breadcrumbs
        items={[
          { label: 'Services', href: `/salon/${salonId}/services` },
          { label: state.service.name, href: `/salon/${salonId}/services/${serviceId}` },
          { label: 'Edit' },
        ]}
      />
      <Card className="max-w-lg">
        <h1 className="text-xl font-semibold text-text-primary">Edit service</h1>
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {error ? <Alert tone="danger" title={error} /> : null}

          <FormField label="Name">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </FormField>

          <FormField label="Category" optional>
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
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

          <div className="flex flex-col gap-4 sm:flex-row">
            <FormField label="Price">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              )}
            </FormField>
            <FormField label="Currency">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  required
                  maxLength={3}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              )}
            </FormField>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <FormField label="Duration (minutes)">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  required
                  type="number"
                  min="5"
                  max="480"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              )}
            </FormField>
            <FormField label="Buffer (minutes)" optional>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="number"
                  min="0"
                  max="120"
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(e.target.value)}
                />
              )}
            </FormField>
          </div>

          <Button type="submit" loading={submitting} disabled={submitting}>
            Save changes
          </Button>
        </form>
      </Card>
    </main>
  );
}
