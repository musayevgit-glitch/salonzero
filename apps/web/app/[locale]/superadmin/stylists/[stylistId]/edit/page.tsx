'use client';

import { Alert, Breadcrumbs, Button, Card, ErrorState, FormField, Input, PermissionDeniedState, Select, Skeleton, Textarea, useToast } from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../../lib/api-client';

interface StylistDetail { id: string; fullName: string; bio: string | null; isActive: boolean; salon: { id: string; name: string }; }
type LoadState = { kind: 'loading' } | { kind: 'not-found' } | { kind: 'error'; message: string } | { kind: 'ready'; stylist: StylistDetail };

export default function EditStylistPage() {
  const router = useRouter();
  const { stylistId } = useParams<{ stylistId: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<StylistDetail>(`/superadmin/stylists/${stylistId}`)
      .then((s) => {
        setState({ kind: 'ready', stylist: s });
        setFullName(s.fullName);
        setBio(s.bio ?? '');
        setIsActive(s.isActive);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) { setState({ kind: 'not-found' }); return; }
        setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Xəta' });
      });
  }, [stylistId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || state.kind !== 'ready') return;
    if (!fullName.trim()) { setError('Ad daxil edilməlidir.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/superadmin/stylists/${stylistId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fullName: fullName.trim(), bio: bio.trim() || null, isActive }),
      });
      showToast('Stilist yeniləndi');
      router.push(`/superadmin/stylists/${stylistId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xəta baş verdi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === 'loading') return <main style={{ padding: '2rem' }}><Skeleton className="h-64 w-full max-w-lg" /></main>;
  if (state.kind === 'not-found') return <main style={{ padding: '2rem' }}><PermissionDeniedState /></main>;
  if (state.kind === 'error') return <main style={{ padding: '2rem' }}><ErrorState title="Stilist yüklənmədi" description={state.message} /></main>;

  const { stylist } = state;

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 2rem' }}>
      <Breadcrumbs items={[{ label: 'Stilistlər', href: '/superadmin/stylists' }, { label: stylist.fullName, href: `/superadmin/stylists/${stylistId}` }, { label: 'Redaktə' }]} />
      <Card style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Stilisti redaktə et</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Salon: <strong>{stylist.salon.name}</strong></p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} noValidate>
          {error && <Alert tone="danger" title={error} />}

          <FormField label="Ad Soyad">
            {(p) => <Input {...p} required value={fullName} onChange={(e) => setFullName(e.target.value)} />}
          </FormField>

          <FormField label="Bioqrafiya" optional>
            {(p) => <Textarea {...p} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />}
          </FormField>

          <FormField label="Status">
            {(p) => (
              <Select {...p} value={isActive ? 'ACTIVE' : 'INACTIVE'} onChange={(e) => setIsActive(e.target.value === 'ACTIVE')}>
                <option value="ACTIVE">Aktiv</option>
                <option value="INACTIVE">Deaktiv</option>
              </Select>
            )}
          </FormField>

          <Button type="submit" loading={submitting} disabled={submitting}>Yadda saxla</Button>
        </form>
      </Card>
    </main>
  );
}
