'use client';

import { Alert, Breadcrumbs, Button, Card, FormField, Input } from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch, ApiError } from '../../../../../../lib/api-client';

export default function NewServiceCategoryPage() {
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/salons/${salonId}/service-categories`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      router.push(`/salon/${salonId}/service-categories`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-col gap-6 p-8">
      <Breadcrumbs
        items={[
          { label: 'Service categories', href: `/salon/${salonId}/service-categories` },
          { label: 'New' },
        ]}
      />
      <Card className="max-w-lg">
        <h1 className="text-xl font-semibold text-text-primary">New service category</h1>
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
            Create category
          </Button>
        </form>
      </Card>
    </main>
  );
}
