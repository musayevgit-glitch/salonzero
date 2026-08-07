'use client';

import {
  Badge, Button, ConfirmDialog, EmptyState, ErrorState, Input, Link,
  MobileRecordList, Pagination, PermissionDeniedState, Select, Skeleton, Table, useToast,
} from '@salonomia/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../lib/api-client';

interface Salon { id: string; name: string; }
interface StylistListItem {
  id: string; fullName: string; bio: string | null; photoUrl: string | null;
  isActive: boolean; createdAt: string; salonId: string; salonName: string;
}
interface StylistListResponse { items: StylistListItem[]; total: number; page: number; pageSize: number; }
type LoadState = { kind: 'loading' } | { kind: 'permission-denied' } | { kind: 'error'; message: string } | { kind: 'ready'; data: StylistListResponse };

export default function SuperadminStylistsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'INACTIVE'>('');
  const [salonFilter, setSalonFilter] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [salons, setSalons] = useState<Salon[]>([]);
  const [actionStylist, setActionStylist] = useState<StylistListItem | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    apiFetch<{ items: Salon[] }>('/salons?pageSize=200').then((r) => setSalons(r.items)).catch(() => {});
  }, []);

  function load() {
    setState({ kind: 'loading' });
    const query = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) query.set('search', search);
    if (status) query.set('status', status);
    if (salonFilter) query.set('salonId', salonFilter);

    apiFetch<StylistListResponse>(`/superadmin/stylists?${query}`)
      .then((data) => setState({ kind: 'ready', data }))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) { router.replace('/login?returnTo=/superadmin/stylists'); return; }
        if (err instanceof ApiError && (err.status === 404 || err.status === 403)) { setState({ kind: 'permission-denied' }); return; }
        setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Xəta baş verdi.' });
      });
  }

  useEffect(load, [search, status, salonFilter, page, router]);

  async function handleActionConfirm() {
    if (!actionStylist) return;
    setActionBusy(true);
    try {
      await apiFetch(`/superadmin/stylists/${actionStylist.id}`, {
        method: 'PATCH', body: JSON.stringify({ isActive: !actionStylist.isActive }),
      });
      showToast(actionStylist.isActive ? 'Stilist deaktiv edildi' : 'Stilist aktivləşdirildi');
      setActionStylist(null);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Xəta baş verdi', 'danger');
    } finally {
      setActionBusy(false);
    }
  }

  if (state.kind === 'loading') return <main style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}><Skeleton className="h-10 w-full max-w-md" /><Skeleton className="h-64 w-full" /></main>;
  if (state.kind === 'permission-denied') return <main style={{ padding: '2rem' }}><PermissionDeniedState /></main>;
  if (state.kind === 'error') return <main style={{ padding: '2rem' }}><ErrorState title="Stilistlər yüklənmədi" description={state.message} /></main>;

  const { items, total, pageSize } = state.data;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Stilistlər</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{total} stilist tapıldı</p>
        </div>
        <Link href="/superadmin/stylists/new">+ Yeni stilist</Link>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Input placeholder="Stilist adı axtar..." value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} style={{ maxWidth: 220 }} />
        <Select value={salonFilter} onChange={(e) => { setPage(1); setSalonFilter(e.target.value); }} style={{ maxWidth: 180 }}>
          <option value="">Bütün salonlar</option>
          {salons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as '' | 'ACTIVE' | 'INACTIVE'); }} style={{ maxWidth: 160 }}>
          <option value="">Bütün statuslar</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="INACTIVE">Deaktiv</option>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Stilist tapılmadı" description="Fərqli axtarış parametrləri yoxlayın." />
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'fullName', header: 'Stilist', render: (r: StylistListItem) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f5ece4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#9c5f49', fontSize: '0.85rem', overflow: 'hidden', flexShrink: 0 }}>
                      {r.photoUrl ? <img src={r.photoUrl} alt={r.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : r.fullName.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <Link href={`/superadmin/stylists/${r.id}`} style={{ fontWeight: 500 }}>{r.fullName}</Link>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        <Link href={`/superadmin/salons/${r.salonId}`}>{r.salonName}</Link>
                      </div>
                    </div>
                  </div>
                ),
              },
              { key: 'bio', header: 'Bioqrafiya', render: (r: StylistListItem) => <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.bio ?? '—'}</span> },
              { key: 'status', header: 'Status', render: (r: StylistListItem) => <Badge tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Aktiv' : 'Deaktiv'}</Badge> },
              { key: 'createdAt', header: 'Tarix', render: (r: StylistListItem) => new Date(r.createdAt).toLocaleDateString('az-AZ') },
              {
                key: 'actions', header: '', render: (r: StylistListItem) => (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <Link href={`/superadmin/stylists/${r.id}/edit`} style={{ fontSize: '0.8rem' }}>Redaktə</Link>
                    <Button variant={r.isActive ? 'destructive' : 'secondary'} onClick={() => setActionStylist(r)} style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>
                      {r.isActive ? 'Deaktiv' : 'Aktiv'}
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={items}
            getRowKey={(r) => r.id}
          />
          <MobileRecordList
            rows={items}
            getRowKey={(r) => r.id}
            renderPrimary={(r) => <div><div style={{ fontWeight: 600 }}>{r.fullName}</div><div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{r.salonName}</div></div>}
            renderSecondary={(r) => r.isActive ? 'Aktiv' : 'Deaktiv'}
            renderAction={(r) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <Link href={`/superadmin/stylists/${r.id}`} style={{ fontSize: '0.8rem', textAlign: 'center' }}>Bax</Link>
                <Button variant={r.isActive ? 'destructive' : 'secondary'} onClick={() => setActionStylist(r)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                  {r.isActive ? 'Deaktiv' : 'Aktiv'}
                </Button>
              </div>
            )}
          />
        </>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />

      {actionStylist && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setActionStylist(null)}
          title={actionStylist.isActive ? 'Stilisti deaktiv etmək istəyirsiniz?' : 'Stilisti aktivləşdirmək istəyirsiniz?'}
          description={actionStylist.isActive
            ? `${actionStylist.fullName} müştərilər tərəfindən görünməyəcək.`
            : `${actionStylist.fullName} yenidən onlayn bronlamaya açılacaq.`}
          confirmLabel={actionStylist.isActive ? 'Deaktiv et' : 'Aktivləşdir'}
          destructive={actionStylist.isActive}
          confirming={actionBusy}
          onConfirm={handleActionConfirm}
        />
      )}
    </main>
  );
}
