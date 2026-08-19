'use client';

import { Alert, Breadcrumbs, Button, Card, FormField, Input, Select, Textarea, useToast } from '@salonomia/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface Salon { id: string; name: string; }
interface Category { id: string; name: string; }

export default function NewServicePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [salons, setSalons] = useState<Salon[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [salonId, setSalonId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [currency, setCurrency] = useState('AZN');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [bufferMinutes, setBufferMinutes] = useState('0');
  const [isActive, setIsActive] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ items: Salon[] }>('/salons?pageSize=200')
      .then((r) => setSalons(r.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!salonId) { setCategories([]); setCategoryId(''); return; }
    apiFetch<{ items: Category[] }>(`/salons/${salonId}/service-categories`)
      .then((r) => setCategories(r.items))
      .catch(() => setCategories([]));
  }, [salonId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!salonId) { setError('Salon seçilməlidir.'); return; }
    const price = parseInt(priceAmount);
    if (isNaN(price) || price < 0) { setError('Düzgün qiymət daxil edin (qəpik ilə, məs: 1500 = 15.00).'); return; }
    const dur = parseInt(durationMinutes);
    if (isNaN(dur) || dur < 5) { setError('Müddət ən az 5 dəqiqə olmalıdır.'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<{ id: string }>('/superadmin/services', {
        method: 'POST',
        body: JSON.stringify({
          salonId,
          categoryId: categoryId || null,
          name,
          description: description || null,
          priceAmount: price,
          currency,
          durationMinutes: dur,
          bufferMinutes: parseInt(bufferMinutes) || 0,
          isActive,
        }),
      });
      showToast('Xidmət yaradıldı');
      router.push(`/superadmin/services/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xəta baş verdi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard-page">
      <Breadcrumbs items={[{ label: 'Xidmətlər', href: '/superadmin/services' }, { label: 'Yeni xidmət' }]} />
      <Card style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Yeni xidmət yarat</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} noValidate>
          {error && <Alert tone="danger" title={error} />}

          <FormField label="Salon">
            {(p) => (
              <Select {...p} required value={salonId} onChange={(e) => setSalonId(e.target.value)}>
                <option value="">Salon seçin...</option>
                {salons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}
          </FormField>

          <FormField label="Kateqoriya" optional>
            {(p) => (
              <Select {...p} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!salonId}>
                <option value="">Kateqoriya seçin (isteğe bağlı)</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
          </FormField>

          <FormField label="Xidmət adı">
            {(p) => <Input {...p} required value={name} onChange={(e) => setName(e.target.value)} />}
          </FormField>

          <FormField label="Açıqlama" optional>
            {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} />}
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <FormField label="Qiymət (qəpik)" description="Məs: 1500 = 15.00 AZN">
              {(p) => <Input {...p} type="number" min="0" required value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} />}
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
              {(p) => <Input {...p} type="number" min="5" max="480" required value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />}
            </FormField>
            <FormField label="Bufer (dəq)" optional description="Xidmətdən sonra boş vaxt">
              {(p) => <Input {...p} type="number" min="0" max="120" value={bufferMinutes} onChange={(e) => setBufferMinutes(e.target.value)} />}
            </FormField>
          </div>

          <FormField label="Status">
            {(p) => (
              <Select {...p} value={isActive ? 'ACTIVE' : 'INACTIVE'} onChange={(e) => setIsActive(e.target.value === 'ACTIVE')}>
                <option value="ACTIVE">Aktiv</option>
                <option value="INACTIVE">Deaktiv</option>
              </Select>
            )}
          </FormField>

          <Button type="submit" loading={submitting} disabled={submitting}>Xidmət yarat</Button>
        </form>
      </Card>
    </main>
  );
}
