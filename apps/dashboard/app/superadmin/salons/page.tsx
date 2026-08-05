'use client';

import {
  Badge,
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
import { apiFetch, ApiError } from '../../../lib/api-client';

interface SalonListItem {
  id: string;
  slug: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
  city: string | null;
  timezone: string;
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
      .then((data) => {
        if (!cancelled) setState({ kind: 'ready', data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login?returnTo=/superadmin/salons');
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setState({ kind: 'permission-denied' });
          return;
        }
        setState({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'Something went wrong.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [search, status, page, router]);

  if (state.kind === 'loading') {
    return (
      <main className="flex flex-col gap-4 p-8">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (state.kind === 'permission-denied') {
    return (
      <main className="p-8">
        <PermissionDeniedState />
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className="p-8">
        <ErrorState title="Couldn't load salons" description={state.message} />
      </main>
    );
  }

  const { items, total, pageSize } = state.data;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Salons</h1>
        <Link href="/superadmin/salons/new">+ New salon</Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search by name or slug"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as typeof status);
          }}
          className="sm:max-w-40"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No salons found"
          description="Try a different search or status filter."
        />
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'name',
                header: 'Salon',
                render: (row: SalonListItem) => (
                  <Link href={`/superadmin/salons/${row.id}`}>{row.name}</Link>
                ),
              },
              { key: 'city', header: 'City', render: (row: SalonListItem) => row.city ?? '—' },
              {
                key: 'status',
                header: 'Status',
                render: (row: SalonListItem) => (
                  <Badge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{row.status}</Badge>
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
              <Badge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{row.status}</Badge>
            )}
          />
        </>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </main>
  );
}
