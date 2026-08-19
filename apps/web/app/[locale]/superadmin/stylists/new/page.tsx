'use client';

import { Alert, Breadcrumbs, Button, Card, FormField, Input, Select, Textarea, useToast } from '@salonomia/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface Salon { id: string; name: string; }

export default function NewStylistPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [salonId, setSalonId] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ items: Salon[] }>('/salons?pageSize=100')
      .then((r) => setSalons(r.items))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!salonId) { setError('Salon seçilməlidir.'); return; }
    if (!fullName.trim()) { setError('Ad daxil edilməlidir.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<{ id: string }>(`/salons/${salonId}/employees`, {
        method: 'POST',
        body: JSON.stringify({ fullName: fullName.trim(), bio: bio.trim() || undefined }),
      });
      showToast('Stilist yaradıldı');
      router.push(`/superadmin/stylists/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xəta baş verdi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard-page">
      <Breadcrumbs items={[{ label: 'Stilistlər', href: '/superadmin/stylists' }, { label: 'Yeni stilist' }]} />
      <Card style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Yeni stilist yarat</h1>
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

          <FormField label="Ad Soyad">
            {(p) => <Input {...p} required value={fullName} onChange={(e) => setFullName(e.target.value)} />}
          </FormField>

          <FormField label="Bioqrafiya" optional>
            {(p) => <Textarea {...p} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />}
          </FormField>

          <Button type="submit" loading={submitting} disabled={submitting}>Stilist yarat</Button>
        </form>
      </Card>
    </main>
  );
}
