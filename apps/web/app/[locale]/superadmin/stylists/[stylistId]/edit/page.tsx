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

interface StylistDetail {
  id: string;
  fullName: string;
  bio: string | null;
  isActive: boolean;
  photoUrl: string | null;
  salon: { id: string; name: string };
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; stylist: StylistDetail };

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
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/superadmin/stylists/${stylistId}/edit`);
          return;
        }
        if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
          setState({ kind: 'not-found' });
          return;
        }
        setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Xəta baş verdi.' });
      });
  }, [stylistId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || state.kind !== 'ready') return;
    if (!fullName.trim()) { setError('Ad daxil edilməlidir.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/superadmin/stylists/${stylistId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: fullName.trim(),
          bio: bio.trim() || null,
          isActive,
        }),
      });
      showToast('Stilist yeniləndi');
      router.push(`/superadmin/stylists/${stylistId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xəta baş verdi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === 'loading') return (
    <main className="dashboard-page"><Skeleton className="h-80 w-full max-w-lg" /></main>
  );
  if (state.kind === 'not-found') return (
    <main className="dashboard-page"><PermissionDeniedState /></main>
  );
  if (state.kind === 'error') return (
    <main className="dashboard-page"><ErrorState title="Stilist yüklənmədi" description={state.message} /></main>
  );

  const { stylist } = state;

  return (
    <main className="dashboard-page">
      <Breadcrumbs
        items={[
          { label: 'Stilistlər', href: '/superadmin/stylists' },
          { label: stylist.fullName, href: `/superadmin/stylists/${stylistId}` },
          { label: 'Redaktə' },
        ]}
      />

      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-text-primary mb-1">Stilisti redaktə et</h1>
        <p className="text-sm text-text-secondary">
          Salon: <span className="font-medium text-text-primary">{stylist.salon.name}</span>
        </p>
      </div>

      <Card className="max-w-lg">
        {stylist.photoUrl && (
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
            <img
              src={stylist.photoUrl}
              alt={stylist.fullName}
              className="h-12 w-12 rounded-full object-cover border border-border"
            />
            <div>
              <p className="text-sm font-medium text-text-primary">{stylist.fullName}</p>
              <p className="text-xs text-text-secondary">Foto profil səhifəsindən dəyişdirilə bilər</p>
            </div>
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {error && <Alert tone="danger" title={error} />}

          <FormField label="Ad Soyad">
            {(p) => (
              <Input
                {...p}
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Leyla Həsənova"
              />
            )}
          </FormField>

          <FormField label="Bioqrafiya" optional>
            {(p) => (
              <Textarea
                {...p}
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Stilist haqqında qısa məlumat, ixtisas sahəsi..."
              />
            )}
          </FormField>

          <FormField label="Status">
            {(p) => (
              <Select
                {...p}
                value={isActive ? 'ACTIVE' : 'INACTIVE'}
                onChange={(e) => setIsActive(e.target.value === 'ACTIVE')}
              >
                <option value="ACTIVE">Aktiv — müştərilərə görünür</option>
                <option value="INACTIVE">Deaktiv — onlayn bronlamaya bağlı</option>
              </Select>
            )}
          </FormField>

          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={submitting} disabled={submitting}>
              Yadda saxla
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push(`/superadmin/stylists/${stylistId}`)}>
              Ləğv et
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
