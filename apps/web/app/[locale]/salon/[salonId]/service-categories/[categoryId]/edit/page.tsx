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
  useToast,
} from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../../../lib/api-client';

interface ServiceCategoryDetail {
  id: string;
  name: string;
  updatedAt: string;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; category: ServiceCategoryDetail };

export default function EditServiceCategoryPage() {
  const router = useRouter();
  const { salonId, categoryId } = useParams<{ salonId: string; categoryId: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<ServiceCategoryDetail>(`/salons/${salonId}/service-categories/${categoryId}`)
      .then((category) => {
        setState({ kind: 'ready', category });
        setName(category.name);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/salon/${salonId}/service-categories/${categoryId}/edit`);
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
  }, [salonId, categoryId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== 'ready' || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/salons/${salonId}/service-categories/${categoryId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, expectedUpdatedAt: state.category.updatedAt }),
      });
      showToast('Category updated');
      router.push(`/salon/${salonId}/service-categories`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('This category was changed by someone else. Reload the page and try again.');
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
        <Skeleton className="h-48 w-full max-w-lg" />
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
        <ErrorState title="Couldn't load this category" description={state.message} />
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <Breadcrumbs
        items={[
          { label: 'Service categories', href: `/salon/${salonId}/service-categories` },
          { label: state.category.name },
        ]}
      />
      <Card className="max-w-lg">
        <h1 className="text-xl font-semibold text-text-primary">Edit service category</h1>
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

          <Button type="submit" loading={submitting} disabled={submitting}>
            Save changes
          </Button>
        </form>
      </Card>
    </main>
  );
}
