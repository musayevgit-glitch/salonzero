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
import { apiFetch, ApiError } from '../../../../../../lib/api-client';

interface Category {
  id: string;
  name: string;
}
interface ServiceDetail {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
  categoryId?: string | null;
  salon: { id: string; name: string };
}
type LoadState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; service: ServiceDetail };

export default function EditServicePage() {
  const router = useRouter();
  const { serviceId } = useParams<{ serviceId: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [currency, setCurrency] = useState('AZN');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [bufferMinutes, setBufferMinutes] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<ServiceDetail>(`/superadmin/services/${serviceId}`)
      .then((s) => {
        setState({ kind: 'ready', service: s });
        setName(s.name);
        setDescription(s.description ?? '');
        setCategoryId(s.categoryId ?? '');
        setPriceAmount(String(s.priceAmount));
        setCurrency(s.currency);
        setDurationMinutes(String(s.durationMinutes));
        setBufferMinutes(String(s.bufferMinutes));
        setIsActive(s.isActive);
        // load categories for this salon
        apiFetch<Category[]>(`/salons/${s.salon.id}/service-categories`)
          .then((r) => setCategories(Array.isArray(r) ? r : []))
          .catch(() => {});
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          setState({ kind: 'not-found' });
          return;
        }
        setState({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'Xəta baş verdi.',
        });
      });
  }, [serviceId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const price = parseInt(priceAmount);
    if (isNaN(price) || price < 0) {
      setError('Düzgün qiymət daxil edin.');
      return;
    }
    const dur = parseInt(durationMinutes);
    if (isNaN(dur) || dur < 5) {
      setError('Müddət ən az 5 dəqiqə olmalıdır.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/superadmin/services/${serviceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          description: description || null,
          categoryId: categoryId || null,
          priceAmount: price,
          currency,
          durationMinutes: dur,
          bufferMinutes: parseInt(bufferMinutes) || 0,
          isActive,
        }),
      });
      showToast('Xidmət yeniləndi');
      router.push(`/superadmin/services/${serviceId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xəta baş verdi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === 'loading')
    return (
      <main className="dashboard-page">
        <Skeleton className="h-64 w-full max-w-lg" />
      </main>
    );
  if (state.kind === 'not-found')
    return (
      <main className="dashboard-page">
        <PermissionDeniedState />
      </main>
    );
  if (state.kind === 'error')
    return (
      <main className="dashboard-page">
        <ErrorState title="Xidmət yüklənmədi" description={state.message} />
      </main>
    );

  const { service } = state;

  return (
    <main className="dashboard-page">
      <Breadcrumbs
        items={[
          { label: 'Xidmətlər', href: '/superadmin/services' },
          { label: service.name, href: `/superadmin/services/${serviceId}` },
          { label: 'Redaktə' },
        ]}
      />
      <Card style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          Xidməti redaktə et
        </h1>
        <p
          style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}
        >
          Salon: <strong>{service.salon.name}</strong>
        </p>
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          noValidate
        >
          {error && <Alert tone="danger" title={error} />}

          <FormField label="Kateqoriya" optional>
            {(p) => (
              <Select {...p} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Kateqoriyasız</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField label="Xidmət adı">
            {(p) => (
              <Input {...p} required value={name} onChange={(e) => setName(e.target.value)} />
            )}
          </FormField>

          <FormField label="Açıqlama" optional>
            {(p) => (
              <Textarea
                {...p}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label="Qiymət (qəpik)">
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  min="0"
                  required
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value)}
                />
              )}
            </FormField>
            <FormField label="Valyuta">
              {(p) => (
                <Select {...p} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="AZN">AZN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Select>
              )}
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label="Müddət (dəq)">
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  min="5"
                  max="480"
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              )}
            </FormField>
            <FormField label="Bufer (dəq)" optional>
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  min="0"
                  max="120"
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(e.target.value)}
                />
              )}
            </FormField>
          </div>

          <FormField label="Status">
            {(p) => (
              <Select
                {...p}
                value={isActive ? 'ACTIVE' : 'INACTIVE'}
                onChange={(e) => setIsActive(e.target.value === 'ACTIVE')}
              >
                <option value="ACTIVE">Aktiv</option>
                <option value="INACTIVE">Deaktiv</option>
              </Select>
            )}
          </FormField>

          <Button type="submit" loading={submitting} disabled={submitting}>
            Yadda saxla
          </Button>
        </form>
      </Card>
    </main>
  );
}
