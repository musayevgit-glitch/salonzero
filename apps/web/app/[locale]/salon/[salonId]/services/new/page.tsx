'use client';

import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  FormField,
  Input,
  Select,
  Textarea,
} from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../../lib/api-client';

interface ServiceCategory {
  id: string;
  name: string;
}

export default function NewServicePage() {
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [bufferMinutes, setBufferMinutes] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<ServiceCategory[]>(`/salons/${salonId}/service-categories`)
      .then(setCategories)
      .catch(() => undefined);
  }, [salonId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const priceAmount = Math.round(Number(price) * 100);
      const body: Record<string, unknown> = {
        name,
        priceAmount,
        currency: currency.trim().toUpperCase(),
        durationMinutes: Number(durationMinutes),
        bufferMinutes: Number(bufferMinutes),
      };
      if (categoryId) body.categoryId = categoryId;
      if (description) body.description = description;

      const created = await apiFetch<{ id: string }>(`/salons/${salonId}/services`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      router.push(`/salon/${salonId}/services/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard-page">
      <Breadcrumbs
        items={[{ label: 'Services', href: `/salon/${salonId}/services` }, { label: 'New' }]}
      />
      <Card className="max-w-lg">
        <h1 className="text-xl font-semibold text-text-primary">New service</h1>
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
            Create service
          </Button>
        </form>
      </Card>
    </main>
  );
}
