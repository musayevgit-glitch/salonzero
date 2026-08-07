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
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../../../lib/api-client';

interface EmployeeListItem {
  id: string;
  fullName: string;
  bio: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

interface EmployeeListResponse {
  items: EmployeeListItem[];
  total: number;
  page: number;
  pageSize: number;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'permission-denied' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: EmployeeListResponse };

export default function SalonEmployeesPage() {
  const router = useRouter();
  const { salonId } = useParams<{ salonId: string }>();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });

    const query = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) query.set('search', search);
    if (activeFilter) query.set('isActive', activeFilter);

    apiFetch<EmployeeListResponse>(`/salons/${salonId}/employees?${query.toString()}`)
      .then((data) => {
        if (!cancelled) setState({ kind: 'ready', data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/login?returnTo=/salon/${salonId}/employees`);
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
  }, [salonId, search, activeFilter, page, router]);

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
        <ErrorState title="Couldn't load employees" description={state.message} />
      </main>
    );
  }

  const { items, total, pageSize } = state.data;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Employees</h1>
        <Link href={`/salon/${salonId}/employees/new`}>+ New employee</Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search by name"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="sm:max-w-xs"
        />
        <Select
          value={activeFilter}
          onChange={(e) => {
            setPage(1);
            setActiveFilter(e.target.value as typeof activeFilter);
          }}
          className="sm:max-w-40"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No employees found"
          description="Try a different search or status filter."
        />
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'fullName',
                header: 'Name',
                render: (row: EmployeeListItem) => (
                  <Link href={`/salon/${salonId}/employees/${row.id}`}>{row.fullName}</Link>
                ),
              },
              { key: 'bio', header: 'Bio', render: (row: EmployeeListItem) => row.bio ?? '—' },
              {
                key: 'isActive',
                header: 'Status',
                render: (row: EmployeeListItem) => (
                  <Badge tone={row.isActive ? 'success' : 'neutral'}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                ),
              },
            ]}
            rows={items}
            getRowKey={(row) => row.id}
          />
          <MobileRecordList
            rows={items}
            getRowKey={(row) => row.id}
            renderPrimary={(row) => (
              <Link href={`/salon/${salonId}/employees/${row.id}`}>{row.fullName}</Link>
            )}
            renderSecondary={(row) => row.bio ?? ''}
            renderAction={(row) => (
              <Badge tone={row.isActive ? 'success' : 'neutral'}>
                {row.isActive ? 'Active' : 'Inactive'}
              </Badge>
            )}
          />
        </>
      )}

      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </main>
  );
}
