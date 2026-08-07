'use client';

import {
  Badge, ConfirmDialog, DropdownMenu, EmptyState, ErrorState, Input, Link,
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

  if (state.kind === 'loading') return (
    <main className="flex flex-col gap-4 p-8">
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-64 w-full" />
    </main>
  );
  if (state.kind === 'permission-denied') return <main className="p-8"><PermissionDeniedState /></main>;
  if (state.kind === 'error') return <main className="p-8"><ErrorState title="Stilistlər yüklənmədi" description={state.message} /></main>;

  const { items, total, pageSize } = state.data;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Stilistlər</h1>
          <p className="text-sm text-text-secondary mt-0.5">Cəmi {total} stilist</p>
        </div>
        <Link href="/superadmin/stylists/new">+ Yeni stilist</Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Ad ilə axtar" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} className="max-w-xs" />
        <Select value={salonFilter} onChange={(e) => { setPage(1); setSalonFilter(e.target.value); }} className="max-w-48">
          <option value="">Bütün salonlar</option>
          {salons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as '' | 'ACTIVE' | 'INACTIVE'); }} className="max-w-40">
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
                key: 'fullName', header: 'Stilist',
                render: (r: StylistListItem) => (
                  <div className="flex items-center gap-3">
                    {r.photoUrl
                      ? <img src={r.photoUrl} alt={r.fullName} className="h-9 w-9 flex-shrink-0 rounded-full object-cover border border-border" />
                      : (
                        <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface border border-border text-sm font-bold text-text-secondary">
                          {r.fullName.slice(0, 1).toUpperCase()}
                        </span>
                      )
                    }
                    <div className="min-w-0">
                      <Link href={`/superadmin/stylists/${r.id}`} className="font-medium">{r.fullName}</Link>
                      <p className="text-xs text-text-secondary truncate">
                        <Link href={`/superadmin/salons/${r.salonId}`}>{r.salonName}</Link>
                      </p>
                    </div>
                  </div>
                ),
              },
              { key: 'bio', header: 'Bioqrafiya', render: (r: StylistListItem) => <span className="text-sm text-text-secondary line-clamp-1 max-w-[200px]">{r.bio ?? '—'}</span> },
              { key: 'status', header: 'Status', render: (r: StylistListItem) => <Badge tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Aktiv' : 'Deaktiv'}</Badge> },
              { key: 'createdAt', header: 'Əlavə edilib', render: (r: StylistListItem) => new Date(r.createdAt).toLocaleDateString('az-AZ') },
              {
                key: 'actions', header: '',
                render: (r: StylistListItem) => (
                  <DropdownMenu
                    trigger={<button className="rounded p-1 text-text-secondary hover:bg-surface" aria-label="Əməliyyatlar">⋮</button>}
                    items={[
                      { label: 'Profilə keç', onSelect: () => router.push(`/superadmin/stylists/${r.id}`) },
                      { label: 'Redaktə et', onSelect: () => router.push(`/superadmin/stylists/${r.id}/edit`) },
                      { label: r.isActive ? 'Deaktiv et' : 'Aktivləşdir', onSelect: () => setActionStylist(r), destructive: r.isActive },
                    ]}
                  />
                ),
              },
            ]}
            rows={items}
            getRowKey={(r) => r.id}
          />
          <MobileRecordList
            rows={items}
            getRowKey={(r) => r.id}
            renderPrimary={(r) => (
              <div>
                <Link href={`/superadmin/stylists/${r.id}`} className="font-medium">{r.fullName}</Link>
                <p className="text-xs text-text-secondary">{r.salonName}</p>
              </div>
            )}
            renderSecondary={(r) => r.bio ?? ''}
            renderAction={(r) => <Badge tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Aktiv' : 'Deaktiv'}</Badge>}
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
