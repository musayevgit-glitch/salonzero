'use client';

import { Alert, Breadcrumbs, Button, Card, FormField, Input, Textarea } from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

export default function NewEmployeePage() {
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return; // duplicate-submit protection
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, string> = { fullName };
      if (bio) body.bio = bio;
      const created = await apiFetch<{ id: string }>(`/salons/${salonId}/employees`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      router.push(`/salon/${salonId}/employees/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-col gap-6 p-8">
      <Breadcrumbs
        items={[{ label: 'Employees', href: `/salon/${salonId}/employees` }, { label: 'New' }]}
      />
      <Card className="max-w-lg">
        <h1 className="text-xl font-semibold text-text-primary">New employee</h1>
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {error ? <Alert tone="danger" title={error} /> : null}

          <FormField label="Full name">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            )}
          </FormField>

          <FormField label="Bio" optional>
            {(fieldProps) => (
              <Textarea {...fieldProps} value={bio} onChange={(e) => setBio(e.target.value)} />
            )}
          </FormField>

          <Button type="submit" loading={submitting} disabled={submitting}>
            Create employee
          </Button>
        </form>
      </Card>
    </main>
  );
}
