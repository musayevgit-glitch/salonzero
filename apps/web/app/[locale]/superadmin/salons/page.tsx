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
import { FilterBar } from '../../../_components/admin/FilterBar';
import { LinkButton } from '../../../_components/admin/LinkButton';
import { PageHeader } from '../../../_components/admin/PageHeader';

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
    <main className="dashboard-page">
      <Skeleton className="h-10 w-full max-w-md" />
      <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
    </main>
  );

  if (state.kind === 'permission-denied') return <main className="dashboard-page"><PermissionDeniedState /></main>;
  if (state.kind === 'error') return <main className="dashboard-page"><ErrorState title="Salonlar yüklənmədi" description={state.message} /></main>;

  const { items, total, pageSize } = state.data;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="dashboard-page">
      <PageHeader
        title="Salonlar"
        description={`Cəmi ${total} salon`}
        actions={
          <LinkButton href="/superadmin/salons/new">+ Yeni salon</LinkButton>
        }
      />

      <FilterBar
        search={
          <Input
            placeholder="Ad və ya slug ilə axtar"
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            aria-label="Salon axtar"
          />
        }
      >
        <Select
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value as typeof status); }}
          aria-label="Status filtri"
          className="sm:max-w-44"
        >
          <option value="">Bütün statuslar</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="SUSPENDED">Deaktiv</option>
        </Select>
      </FilterBar>

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
