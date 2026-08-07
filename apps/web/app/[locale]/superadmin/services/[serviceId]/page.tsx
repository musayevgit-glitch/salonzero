'use client';

import { Badge, Breadcrumbs, Button, Card, ConfirmDialog, ErrorState, Link, PermissionDeniedState, Skeleton, useToast } from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface Stylist { id: string; fullName: string; isActive: boolean; photoUrl: string | null; }
interface ServiceDetail {
  id: string; name: string; description: string | null;
  priceAmount: number; currency: string; durationMinutes: number; bufferMinutes: number;
  isActive: boolean; createdAt: string; updatedAt: string;
  salon: { id: string; name: string; timezone: string };
  category: { id: string; name: string } | null;
  assignedStylists: Stylist[];
  reservationCount: number;
}
type LoadState = { kind: 'loading' } | { kind: 'not-found' } | { kind: 'error'; message: string } | { kind: 'ready'; service: ServiceDetail };

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat('az-AZ', { style: 'currency', currency }).format(cents / 100);
}

export default function ServiceDetailPage() {
  const router = useRouter();
  const { serviceId } = useParams<{ serviceId: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<ServiceDetail>(`/superadmin/services/${serviceId}`)
      .then((service) => setState({ kind: 'ready', service }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) { router.replace(`/login?returnTo=/superadmin/services/${serviceId}`); return; }
        if (err instanceof ApiError && err.status === 404) { setState({ kind: 'not-found' }); return; }
        setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Xəta baş verdi.' });
      });
  }

  useEffect(load, [serviceId]);

  async function handleToggle() {
    if (state.kind !== 'ready') return;
    setBusy(true);
    try {
      await apiFetch(`/superadmin/services/${serviceId}`, {
        method: 'PATCH', body: JSON.stringify({ isActive: !state.service.isActive }),
      });
      showToast(state.service.isActive ? 'Xidmət deaktiv edildi' : 'Xidmət aktivləşdirildi');
      setConfirmOpen(false);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta baş verdi', 'danger');
    } finally {
      setBusy(false);
    }
  }

  if (state.kind === 'loading') return <main style={{ padding: '2rem' }}><Skeleton className="h-64 w-full max-w-lg" /></main>;
  if (state.kind === 'not-found') return <main style={{ padding: '2rem' }}><PermissionDeniedState /></main>;
  if (state.kind === 'error') return <main style={{ padding: '2rem' }}><ErrorState title="Xidmət yüklənmədi" description={state.message} /></main>;

  const { service } = state;

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 2rem' }}>
      <Breadcrumbs items={[{ label: 'Xidmətlər', href: '/superadmin/services' }, { label: service.name }]} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Main info */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{service.name}</h1>
            <Badge tone={service.isActive ? 'success' : 'neutral'}>{service.isActive ? 'Aktiv' : 'Deaktiv'}</Badge>
          </div>

          {service.description && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>{service.description}</p>}

          <dl style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <dt style={{ color: 'var(--color-text-secondary)' }}>Salon</dt>
              <dd><Link href={`/superadmin/salons/${service.salon.id}`}>{service.salon.name}</Link></dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <dt style={{ color: 'var(--color-text-secondary)' }}>Kateqoriya</dt>
              <dd>{service.category?.name ?? '—'}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <dt style={{ color: 'var(--color-text-secondary)' }}>Qiymət</dt>
              <dd style={{ fontWeight: 600 }}>{fmt(service.priceAmount, service.currency)}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <dt style={{ color: 'var(--color-text-secondary)' }}>Müddət</dt>
              <dd>{service.durationMinutes} dəq</dd>
            </div>
            {service.bufferMinutes > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <dt style={{ color: 'var(--color-text-secondary)' }}>Bufer</dt>
                <dd>{service.bufferMinutes} dəq</dd>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <dt style={{ color: 'var(--color-text-secondary)' }}>Rezervasiya sayı</dt>
              <dd style={{ fontWeight: 600 }}>{service.reservationCount}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <dt style={{ color: 'var(--color-text-secondary)' }}>Yaradılıb</dt>
              <dd>{new Date(service.createdAt).toLocaleDateString('az-AZ')}</dd>
            </div>
          </dl>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <Link href={`/superadmin/services/${service.id}/edit`}>Redaktə et</Link>
            <Button variant={service.isActive ? 'destructive' : 'secondary'} onClick={() => setConfirmOpen(true)}>
              {service.isActive ? 'Deaktiv et' : 'Aktivləşdir'}
            </Button>
            <Link href={`/superadmin/salons/${service.salon.id}`} style={{ fontSize: '0.875rem' }}>
              Salona keç →
            </Link>
          </div>
        </Card>

        {/* Assigned stylists */}
        <Card>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>
            Təyin edilmiş stilistlər ({service.assignedStylists.length})
          </h2>
          {service.assignedStylists.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Bu xidmətə stilist təyin edilməyib.{' '}
              <Link href={`/salon/${service.salon.id}/services/${service.id}`}>Salon panelindən təyin edin →</Link>
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {service.assignedStylists.map((s) => (
                <Link
                  key={s.id}
                  href={`/superadmin/stylists/${s.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', textDecoration: 'none' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f5ece4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#9c5f49', fontSize: '0.8rem', overflow: 'hidden', flexShrink: 0 }}>
                    {s.photoUrl ? <img src={s.photoUrl} alt={s.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.fullName.slice(0, 1)}
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{s.fullName}</span>
                  <span style={{ marginLeft: 'auto' }}><Badge tone={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'Aktiv' : 'Deaktiv'}</Badge></span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={service.isActive ? 'Xidməti deaktiv etmək istəyirsiniz?' : 'Xidməti aktivləşdirmək istəyirsiniz?'}
        description={service.isActive
          ? 'Bu xidmət yeni rezervasiyalar üçün bağlanacaq. Mövcud rezervasiyalar qalacaq.'
          : 'Bu xidmət yenidən onlayn bronlamaya açılacaq.'}
        confirmLabel={service.isActive ? 'Deaktiv et' : 'Aktivləşdir'}
        destructive={service.isActive}
        confirming={busy}
        onConfirm={handleToggle}
      />
    </main>
  );
}
