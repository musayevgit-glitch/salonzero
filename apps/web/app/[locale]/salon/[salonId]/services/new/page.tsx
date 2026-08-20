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
import { useTranslations } from 'next-intl';
import { apiFetch, ApiError } from '../../../../../../lib/api-client';

interface ServiceCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export default function NewServicePage() {
  const t = useTranslations('salonAdmin');
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('AZN');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [bufferMinutes, setBufferMinutes] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<ServiceCategory[]>(`/salons/${salonId}/service-categories`)
      .then((cats) => setCategories(cats.filter((c) => c.isActive)))
      .catch(() => setCategories([]));
  }, [salonId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const priceAmount = Math.round(Number(price) * 100);
      if (isNaN(priceAmount) || priceAmount < 0) {
        setError(t('services.invalidPrice'));
        return;
      }
      const body: Record<string, unknown> = {
        name: name.trim(),
        priceAmount,
        currency: currency.trim().toUpperCase(),
        durationMinutes: Number(durationMinutes),
        bufferMinutes: Number(bufferMinutes),
      };
      if (categoryId) body.categoryId = categoryId;
      if (description.trim()) body.description = description.trim();

      const created = await apiFetch<{ id: string }>(`/salons/${salonId}/services`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      router.push(`/salon/${salonId}/services/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard-page">
      <Breadcrumbs
        items={[
          { label: t('services.title'), href: `/salon/${salonId}/services` },
          { label: t('services.new') },
        ]}
      />
      <Card className="max-w-lg">
        <h1 className="text-xl font-semibold text-text-primary">{t('services.newTitle')}</h1>
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {error ? <Alert tone="danger" title={error} /> : null}

          <FormField label={t('services.name')}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </FormField>

          <FormField label={t('services.category')} optional>
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">{t('services.uncategorized')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField label={t('services.description')} optional>
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </FormField>

          <div className="flex flex-col gap-4 sm:flex-row">
            <FormField label={t('services.price')}>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              )}
            </FormField>
            <FormField label={t('services.currency')}>
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="AZN">AZN — Manat</option>
                  <option value="USD">USD — Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="TRY">TRY — Lirə</option>
                </Select>
              )}
            </FormField>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <FormField label={t('services.duration')}>
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
            <FormField label={t('services.buffer')} optional>
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
            {t('services.create')}
          </Button>
        </form>
      </Card>
    </main>
  );
}
