'use client';

import { Badge, Breadcrumbs, Button, Card, ConfirmDialog, ErrorState, Link, PermissionDeniedState, Skeleton, useToast } from '@salonomia/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface Service { id: string; name: string; isActive: boolean; priceAmount: number; currency: string; }
interface Schedule { id: string; weekday: number; startMinuteOfDay: number; endMinuteOfDay: number; }
interface Portfolio { id: string; imageUrl: string; caption: string | null; }
interface StylistDetail {
  id: string; fullName: string; bio: string | null; photoUrl: string | null; isActive: boolean; createdAt: string; updatedAt: string;
  salon: { id: string; name: string; timezone: string; status: string };
  services: Service[];
  workingSchedules: Schedule[];
  portfolio: Portfolio[];
  reservationCount: number;
}
type LoadState = { kind: 'loading' } | { kind: 'not-found' } | { kind: 'error'; message: string } | { kind: 'ready'; stylist: StylistDetail };

const WEEKDAYS = ['Bazar', 'B.ertəsi', 'Çərş.axşamı', 'Çərşənbə', 'C.axşamı', 'Cümə', 'Şənbə'];

function minutesToTime(min: number) {
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat('az-AZ', { style: 'currency', currency }).format(cents / 100);
}

export default function StylistDetailPage() {
  const router = useRouter();
  const { stylistId } = useParams<{ stylistId: string }>();
  const { showToast } = useToast();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<StylistDetail>(`/superadmin/stylists/${stylistId}`)
      .then((stylist) => setState({ kind: 'ready', stylist }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) { router.replace(`/login?returnTo=/superadmin/stylists/${stylistId}`); return; }
        if (err instanceof ApiError && err.status === 404) { setState({ kind: 'not-found' }); return; }
        setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Xəta baş verdi.' });
      });
  }

  useEffect(load, [stylistId]);

  async function handleToggle() {
    if (state.kind !== 'ready') return;
    setBusy(true);
    try {
      await apiFetch(`/superadmin/stylists/${stylistId}`, {
        method: 'PATCH', body: JSON.stringify({ isActive: !state.stylist.isActive }),
      });
      showToast(state.stylist.isActive ? 'Stilist deaktiv edildi' : 'Stilist aktivləşdirildi');
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
  if (state.kind === 'error') return <main style={{ padding: '2rem' }}><ErrorState title="Stilist yüklənmədi" description={state.message} /></main>;

  const { stylist } = state;

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 2rem' }}>
      <Breadcrumbs items={[{ label: 'Stilistlər', href: '/superadmin/stylists' }, { label: stylist.fullName }]} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {/* Profile */}
        <Card>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f5ece4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#9c5f49', fontSize: '1.25rem', overflow: 'hidden', flexShrink: 0 }}>
              {stylist.photoUrl ? <img src={stylist.photoUrl} alt={stylist.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : stylist.fullName.slice(0, 1)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h1 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{stylist.fullName}</h1>
                <Badge tone={stylist.isActive ? 'success' : 'neutral'}>{stylist.isActive ? 'Aktiv' : 'Deaktiv'}</Badge>
              </div>
              <Link href={`/superadmin/salons/${stylist.salon.id}`} style={{ fontSize: '0.8rem' }}>{stylist.salon.name}</Link>
            </div>
          </div>

          {stylist.bio && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>{stylist.bio}</p>}

          <dl style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <dt style={{ color: 'var(--color-text-secondary)' }}>Rezervasiya sayı</dt>
              <dd style={{ fontWeight: 600 }}>{stylist.reservationCount}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <dt style={{ color: 'var(--color-text-secondary)' }}>Xidmət sayı</dt>
              <dd>{stylist.services.length}</dd>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <dt style={{ color: 'var(--color-text-secondary)' }}>Qeydiyyat tarixi</dt>
              <dd>{new Date(stylist.createdAt).toLocaleDateString('az-AZ')}</dd>
            </div>
          </dl>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <Link href={`/superadmin/stylists/${stylist.id}/edit`}>Redaktə et</Link>
            <Button variant={stylist.isActive ? 'destructive' : 'secondary'} onClick={() => setConfirmOpen(true)}>
              {stylist.isActive ? 'Deaktiv et' : 'Aktivləşdir'}
            </Button>
            <Link href={`/salon/${stylist.salon.id}/employees/${stylist.id}`} style={{ fontSize: '0.8rem', opacity: 0.8 }}>
              Salon paneli →
            </Link>
          </div>
        </Card>

        {/* Services */}
        <Card>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Xidmətlər ({stylist.services.length})</h2>
          {stylist.services.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Xidmət təyin edilməyib.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {stylist.services.map((s) => (
                <Link key={s.id} href={`/superadmin/services/${s.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', textDecoration: 'none' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>{s.name}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{fmt(s.priceAmount, s.currency)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Schedule */}
        <Card>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>İş qrafiki</h2>
          {stylist.workingSchedules.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>İş qrafiki təyin edilməyib.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {stylist.workingSchedules.map((ws) => (
                <div key={ws.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{WEEKDAYS[ws.weekday]}</span>
                  <span style={{ fontWeight: 500 }}>{minutesToTime(ws.startMinuteOfDay)} – {minutesToTime(ws.endMinuteOfDay)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Portfolio */}
        {stylist.portfolio.length > 0 && (
          <Card>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>Portfolio ({stylist.portfolio.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
              {stylist.portfolio.map((item) => (
                <img key={item.id} src={item.imageUrl} alt={item.caption ?? ''} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
              ))}
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={stylist.isActive ? 'Stilisti deaktiv etmək istəyirsiniz?' : 'Stilisti aktivləşdirmək istəyirsiniz?'}
        description={stylist.isActive
          ? `${stylist.fullName} müştərilər tərəfindən görünməyəcək və yeni rezervasiyalar qəbul edilməyəcək.`
          : `${stylist.fullName} yenidən onlayn bronlamaya açılacaq.`}
        confirmLabel={stylist.isActive ? 'Deaktiv et' : 'Aktivləşdir'}
        destructive={stylist.isActive}
        confirming={busy}
        onConfirm={handleToggle}
      />
    </main>
  );
}
