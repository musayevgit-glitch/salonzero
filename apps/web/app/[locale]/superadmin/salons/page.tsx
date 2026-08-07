'use client';

import {
  Badge,
  DropdownMenu,
  EmptyState,
  ErrorState,
  Input,
  Link,
  MobileRecordList,
  Pagination,
  PermissionDeniedState,
  Select,
  Skeleton,
  Table,
} from '@salonomia/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../lib/api-client';

interface SalonListItem {
  id: string;
  slug: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
  city: string | null;
  timezone: string;
  logoUrl: string | null;
  createdAt: string;
}

interface SalonListResponse {
  items: SalonListItem[];
  total: number;
  page: number;
  pageSize: number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: SalonListResponse };

export default function SuperadminSalonsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'SUSPENDED'>('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });

    const query = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) query.set('search', search);
    if (status) query.set('status', status);

    apiFetch<SalonListResponse>(`/salons?${query.toString()}`)
      .then((data) => { if (!cancelled) setState({ kind: 'ready', data }); })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) { router.replace('/login?returnTo=/superadmin/salons'); return; }
        if (err instanceof ApiError && err.status === 404) { setState({ kind: 'permission-denied' }); return; }
        setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Something went wrong.' });
      });

    return () => { cancelled = true; };
  }, [search, status, page, router]);

  if (state.kind === 'loading') return (
    <main className="flex flex-col gap-4 p-8">
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-64 w-full" />
    </main>
  );

  if (state.kind === 'permission-denied') return <main className="p-8"><PermissionDeniedState /></main>;
  if (state.kind === 'error') return <main className="p-8"><ErrorState title="Salonlar yüklənmədi" description={state.message} /></main>;

  const { items, total, pageSize } = state.data;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Salonlar</h1>
          <p className="text-sm text-text-secondary mt-0.5">Cəmi {total} salon</p>
        </div>
        <Link href="/superadmin/salons/new">+ Yeni salon</Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Ad və ya slug ilə axtar"
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          className="sm:max-w-xs"
        />
        <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as typeof status); }} className="sm:max-w-40">
          <option value="">Bütün statuslar</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="SUSPENDED">Deaktiv</option>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Salon tapılmadı" description="Axtarış parametrlərini dəyişin." />
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'name',
                header: 'Salon',
                render: (row: SalonListItem) => (
                  <div className="flex items-center gap-3">
                    {row.logoUrl
                      ? <img src={row.logoUrl} alt={row.name} className="h-8 w-8 rounded-full object-cover border border-border flex-shrink-0" />
                      : (
                        <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface border border-border text-xs font-bold text-text-secondary">
                          {row.name.slice(0, 1)}
                        </span>
                      )
                    }
                    <div className="min-w-0">
                      <Link href={`/superadmin/salons/${row.id}`} className="font-medium">{row.name}</Link>
                      <p className="text-xs text-text-secondary truncate">{row.slug}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'city', header: 'Şəhər', render: (row: SalonListItem) => row.city ?? '—' },
              {
                key: 'status',
                header: 'Status',
                render: (row: SalonListItem) => (
                  <Badge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {row.status === 'ACTIVE' ? 'Aktiv' : 'Deaktiv'}
                  </Badge>
                ),
              },
              {
                key: 'created',
                header: 'Yaradılıb',
                render: (row: SalonListItem) => new Date(row.createdAt).toLocaleDateString('az-AZ'),
              },
              {
                key: 'actions',
                header: '',
                render: (row: SalonListItem) => (
                  <DropdownMenu
                    trigger={<button className="rounded p-1 text-text-secondary hover:bg-surface" aria-label="Əməliyyatlar">⋮</button>}
                    items={[
                      { label: 'Detallar', onSelect: () => router.push(`/superadmin/salons/${row.id}`) },
                      { label: 'Redaktə et', onSelect: () => router.push(`/superadmin/salons/${row.id}/edit`) },
                    ]}
                  />
                ),
              },
            ]}
            rows={items}
            getRowKey={(row) => row.id}
          />
          <MobileRecordList
            rows={items}
            getRowKey={(row) => row.id}
            renderPrimary={(row) => <Link href={`/superadmin/salons/${row.id}`}>{row.name}</Link>}
            renderSecondary={(row) => row.city ?? row.timezone}
            renderAction={(row) => (
              <Badge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{row.status === 'ACTIVE' ? 'Aktiv' : 'Deaktiv'}</Badge>
            )}
          />
        </>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </main>
  );
}
